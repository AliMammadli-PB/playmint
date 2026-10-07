/** Import unique SWF files from the pinned swfgames repository into the admin review queue. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { chromium } from "@playwright/test";
import { db, schema } from "../src/lib/db";
import { env, paths } from "../src/lib/env";
import { audit } from "../src/lib/audit";
import { newId, randomToken } from "../src/lib/ids";
import { hashPassword } from "../src/lib/password";
import { createVersion } from "../src/lib/versions";
import { mimeFor } from "../src/lib/mime";
import {
  RUFFLE_PUBLIC_PATH,
  RUFFLE_VERSION,
  SOURCE_REPOSITORY,
  createSwfWrapper,
  dedupeSwfBlobs,
  downloadSwf,
  fetchSwfCatalog,
  guessCategory,
  slugFromTitle,
  storeZip,
  swfBlobUrl,
  titleFromSwfFilename,
  type LegacyFlashMeta,
} from "../src/lib/legacy-flash";

const COVER_PY = `
import sys, colorsys
from PIL import Image, ImageDraw, ImageFont
title, dest = sys.argv[1], sys.argv[2]
w, h = 1280, 720
hue = (150 + (sum(map(ord, title)) % 40)) / 360
bg = tuple(int(c * 255) for c in colorsys.hls_to_rgb(hue, 0.14, 0.42))
image = Image.new("RGB", (w, h), bg)
draw = ImageDraw.Draw(image)
draw.rectangle((0, 0, 18, h), fill=(124, 58, 237))
draw.rectangle((0, h - 140, w, h), fill=(8, 120, 78))
font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 68)
label = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 28)
draw.text((72, 160), "LEGACY FLASH", font=label, fill=(214, 255, 99))
words, lines, line = title.split(), [], ""
for word in words:
    trial = (line + " " + word).strip()
    if line and draw.textlength(trial, font=font) > 1100:
        lines.append(line)
        line = word
    else:
        line = trial
if line:
    lines.append(line)
y = 270
for row in lines[:3]:
    draw.text((72, y), row, font=font, fill=(244, 241, 234))
    y += 84
image.save(dest, "PNG", optimize=True)
`;

function writeCover(title: string, dest: string) {
  const result = spawnSync("python3", ["-c", COVER_PY, title, dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "cover_failed");
}

async function ensureOwner() {
  let user = (await db.select().from(schema.users).where(eq(schema.users.email, "legacy@playmint.tr")))[0];
  if (!user) {
    const id = newId();
    await db.insert(schema.users).values({
      id,
      email: "legacy@playmint.tr",
      name: "Playmint Legacy",
      username: "playmint-legacy",
      role: "developer",
      passwordHash: await hashPassword(randomToken(48)),
    });
    user = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
  }
  await db.insert(schema.developerProfiles).values({
    userId: user.id,
    handle: "playmint-legacy",
    displayName: "Playmint Legacy",
    bio: "Platform-owned archive of legacy Flash games. Original game rights belong to their respective owners. A file on GitHub is not a redistribution license.",
    website: SOURCE_REPOSITORY,
  }).onConflictDoNothing();
  return user;
}

async function versionForSha(sha: string) {
  const found = await db.execute<{ id: string }>(sql`select id from game_versions where report->'legacyFlash'->>'sourceSha' = ${sha} limit 1`);
  return found.rows[0]?.id ?? "";
}

async function probe(versionIds: string[]) {
  const results: { id: string; title: string; runtimeStatus: "ok" | "broken"; ruffleError: string }[] = [];
  if (!versionIds.length) return results;
  const ruffleRoot = path.join(process.cwd(), "public", "legacy", "ruffle");
  let port = 0;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      if (parts[0] === "ruffle") {
        const file = path.resolve(ruffleRoot, ...parts.slice(1));
        if (!file.startsWith(ruffleRoot + path.sep)) throw new Error("bad_path");
        const body = await fs.readFile(file);
        res.writeHead(200, { "Content-Type": file.endsWith(".wasm") ? "application/wasm" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : "application/octet-stream", "Access-Control-Allow-Origin": "*" });
        res.end(body);
        return;
      }
      if (parts[0] === "g" && parts.length >= 2) {
        const version = (await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, parts[1])))[0];
        if (!version) throw new Error("missing");
        if (parts.length === 2 || parts[2] === "index.html") {
          const html = createSwfWrapper({ swfFile: "game.swf", title: "probe", ruffleBaseUrl: `http://127.0.0.1:${port}/ruffle/` });
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }
        const rel = parts.slice(2).join("/");
        const file = path.resolve(version.filesDir, rel);
        if (!file.startsWith(version.filesDir + path.sep)) throw new Error("bad_path");
        const body = await fs.readFile(file);
        res.writeHead(200, { "Content-Type": mimeFor(file) });
        res.end(body);
        return;
      }
      res.writeHead(404).end("missing");
    } catch {
      res.writeHead(404).end("missing");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    for (const id of versionIds) {
      const version = (await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, id)))[0];
      const game = version ? (await db.select().from(schema.games).where(eq(schema.games.id, version.gameId)))[0] : undefined;
      const page = await browser.newPage();
      const logs: string[] = [];
      page.on("pageerror", (error) => logs.push(error.message));
      let runtimeStatus: "ok" | "broken" = "broken";
      let ruffleError = "";
      try {
        await page.goto(`http://127.0.0.1:${port}/g/${id}/index.html`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForFunction(() => document.body.dataset.runtime && document.body.dataset.runtime !== "loading", { timeout: 60_000 });
        const state = await page.evaluate(() => ({ runtime: document.body.dataset.runtime || "", error: document.body.dataset.error || "" }));
        if (state.runtime === "ok") runtimeStatus = "ok";
        else ruffleError = state.error || logs[0] || "Ruffle reported an error";
      } catch (error) {
        ruffleError = error instanceof Error ? error.message : "Ruffle probe failed";
      }
      await page.close();
      if (version?.report.legacyFlash) {
        const legacyFlash: LegacyFlashMeta = { ...version.report.legacyFlash, runtimeStatus, ruffleError: ruffleError || undefined };
        await db.update(schema.gameVersions).set({ report: { ...version.report, legacyFlash } }).where(eq(schema.gameVersions.id, id));
      }
      results.push({ id, title: game?.title || id, runtimeStatus, ruffleError });
      console.log(runtimeStatus === "ok" ? "ruffle ok" : "ruffle broken", game?.title || id, ruffleError);
    }
  } finally {
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return results;
}

async function main() {
  if (!env.siteUrl.startsWith("https://")) throw new Error("SITE_URL must be https so the wrapper does not point at a local origin");
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  const catalog = await fetchSwfCatalog({ token: token || undefined });
  const { unique, duplicatesSkipped } = dedupeSwfBlobs(catalog);
  const owner = await ensureOwner();
  const failures: { file: string; error: string }[] = [];
  let downloaded = 0;
  let imported = 0;
  const importedIds: string[] = [];
  for (const item of unique) {
    const title = titleFromSwfFilename(item.sourceFile);
    if (await versionForSha(item.sha)) {
      console.log("already imported", title);
      continue;
    }
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), "pm-swf-"));
    try {
      const swf = await downloadSwf(swfBlobUrl(item.sha), { token: token || undefined });
      downloaded += 1;
      const sha256 = createHash("sha256").update(swf).digest("hex");
      let slug = slugFromTitle(title, item.sha);
      let game = (await db.select().from(schema.games).where(eq(schema.games.slug, slug)))[0];
      if (game && game.developerId !== owner.id) {
        slug = slugFromTitle(`${title} ${item.sha.slice(0, 6)}`, item.sha);
        game = (await db.select().from(schema.games).where(eq(schema.games.slug, slug)))[0];
      }
      if (!game) {
        const id = newId();
        const description = {
          en: `${title} is a legacy Flash game played with Ruffle ${RUFFLE_VERSION}. No Flash plugin is required.\n\nOriginal game rights belong to their respective owners. Finding this file at ${SOURCE_REPOSITORY} is not permission to redistribute it.\nSource file: ${item.sourceFile}\nGit blob: ${item.sha}`,
          tr: `${title}, Ruffle ${RUFFLE_VERSION} ile oynatılan eski bir Flash oyunudur. Flash eklentisi gerekmez.\n\nOyunun hakları ilgili sahiplerine aittir. Bu dosyanın ${SOURCE_REPOSITORY} adresinde bulunması dağıtım izni değildir.\nKaynak dosya: ${item.sourceFile}\nGit blob: ${item.sha}`,
          az: `${title}, Ruffle ${RUFFLE_VERSION} ilə işlədilən köhnə Flash oyunudur. Flash əlavəsi tələb olunmur.\n\nOyunun hüquqları müvafiq sahiblərinə məxsusdur. Faylın ${SOURCE_REPOSITORY} ünvanında olması yayım icazəsi deyil.\nMənbə faylı: ${item.sourceFile}\nGit blob: ${item.sha}`,
        };
        await db.insert(schema.games).values({
          id,
          developerId: owner.id,
          slug,
          title,
          category: guessCategory(title),
          tags: ["legacy-flash", "ruffle"],
          license: "Developer",
          tagline: { en: "Legacy Flash game", tr: "Eski Flash oyunu", az: "Köhnə Flash oyunu" },
          description,
          mobileResponsive: false,
          fullscreenSupported: true,
          orientation: "landscape",
          isDemo: false,
          status: "draft",
        });
        game = (await db.select().from(schema.games).where(eq(schema.games.id, id)))[0];
      }
      const cover = `${game.id}-legacy.png`;
      await fs.mkdir(paths.covers(), { recursive: true });
      writeCover(title, path.join(paths.covers(), cover));
      await db.update(schema.games).set({ coverPath: cover, updatedAt: new Date() }).where(eq(schema.games.id, game.id));
      const html = createSwfWrapper({ swfFile: "game.swf", title, ruffleBaseUrl: `${env.siteUrl}${RUFFLE_PUBLIC_PATH}` });
      const zipPath = path.join(staging, "game.zip");
      await fs.writeFile(zipPath, storeZip([{ name: "index.html", data: Buffer.from(html) }, { name: "game.swf", data: swf }]));
      const versionId = await createVersion(game.id, { archivePath: zipPath, size: (await fs.stat(zipPath)).size }, `Imported ${item.sourceFile} from ${SOURCE_REPOSITORY} blob ${item.sha}. Rights pending.`, 64);
      const version = (await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, versionId)))[0];
      const legacyFlash: LegacyFlashMeta = {
        sourceType: "github-swf",
        sourceRepository: SOURCE_REPOSITORY,
        sourceFile: item.sourceFile,
        sourceFiles: item.sourceFiles,
        sourceSha: item.sha,
        sha256,
        rightsStatus: "pending",
        technicalStatus: "pending",
        ruffleVersion: RUFFLE_VERSION,
        runtimeStatus: "untested",
        importedAt: new Date().toISOString(),
        swfBytes: swf.length,
      };
      await db.update(schema.gameVersions).set({ report: { ...version.report, legacyFlash } }).where(eq(schema.gameVersions.id, versionId));
      await audit(owner.id, "legacy.import", game.id, { sourceRepository: SOURCE_REPOSITORY, sourceFile: item.sourceFile, sourceSha: item.sha, sha256, rightsStatus: "pending" });
      imported += 1;
      importedIds.push(versionId);
      console.log("imported", title, versionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "import_failed";
      failures.push({ file: item.sourceFile, error: message });
      console.error("failed", item.sourceFile, message);
    } finally {
      await fs.rm(staging, { recursive: true, force: true });
    }
  }
  const pending = await db.execute<{ n: number }>(sql`select count(*)::int as n from game_versions where status = 'pending' and report->'legacyFlash'->>'rightsStatus' = 'pending'`);
  const probeIds = importedIds.length ? importedIds : (await db.execute<{ id: string }>(sql`select id from game_versions where report->'legacyFlash'->>'runtimeStatus' = 'untested'`)).rows.map((row) => row.id);
  let played: { id: string; title: string; runtimeStatus: "ok" | "broken"; ruffleError: string }[] = [];
  try {
    played = await probe(probeIds);
  } catch (error) {
    console.error("probe failed", error instanceof Error ? error.message : error);
  }
  const report = {
    foundSwfs: catalog.length,
    uniqueSwfs: unique.length,
    duplicatesSkipped,
    downloaded,
    imported,
    pendingRights: Number(pending.rows[0]?.n ?? 0),
    failed: failures.length,
    failures,
    ruffleOk: played.filter((item) => item.runtimeStatus === "ok").length,
    ruffleBroken: played.filter((item) => item.runtimeStatus === "broken").map((item) => ({ title: item.title, error: item.ruffleError })),
  };
  const reportDir = path.join(env.dataDir, "import-reports");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `swf-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Found SWFs: ${report.foundSwfs}`);
  console.log(`Unique SWFs: ${report.uniqueSwfs}`);
  console.log(`Duplicates skipped: ${report.duplicatesSkipped}`);
  console.log(`Downloaded: ${report.downloaded}`);
  console.log(`Imported: ${report.imported}`);
  console.log(`Pending rights: ${report.pendingRights}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Ruffle ok: ${report.ruffleOk}`);
  console.log(`Ruffle broken: ${report.ruffleBroken.length}`);
  console.log(`Report: ${reportPath}`);
  if (failures.length) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
