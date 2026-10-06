import "server-only";
import yauzl from "yauzl";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { ScanReport } from "@/lib/db/schema";

export const MAX_FILES = 2000;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

const allowedExt = new Set(
  (
    "html htm css js mjs cjs json map txt md csv xml " +
    "png jpg jpeg gif webp avif svg ico bmp " +
    "mp3 ogg oga wav m4a aac flac opus weba mp4 webm ogv " +
    "ttf otf woff woff2 fnt " +
    "wasm data unityweb glb gltf bin obj mtl ktx2 basis hdr " +
    "atlas tmx tsx tsj ldtk"
  ).split(" "),
);
const allowedBare = new Set(["license", "licence", "readme", "copying", "notice", "changelog", "authors"]);
const ignored = (name: string) =>
  name.startsWith("__MACOSX/") || /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(name) || /(^|\/)\.git\//.test(name);
const textExt = new Set(["html", "htm", "js", "mjs", "cjs", "css", "json"]);

export class ZipError extends Error {
  constructor(public code: string, public detail = "") {
    super(code);
  }
}

type Entry = { name: string; size: number; isDir: boolean };

function openZip(file: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.open(file, { lazyEntries: true, validateEntrySizes: true, strictFileNames: false }, (err, zip) =>
      err || !zip ? reject(new ZipError("zip_invalid", err?.message)) : resolve(zip),
    ),
  );
}

function isSymlink(e: yauzl.Entry) {
  return ((e.externalFileAttributes >>> 16) & 0o170000) === 0o120000;
}

function safeRelative(name: string): string | null {
  const norm = name.replace(/\\/g, "/");
  if (norm.startsWith("/") || /^[a-zA-Z]:/.test(norm)) return null;
  const parts = norm.split("/").filter((p) => p !== "" && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return parts.join("/");
}

async function listEntries(file: string): Promise<Entry[]> {
  const zip = await openZip(file);
  const out: Entry[] = [];
  let total = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("entry", (e: yauzl.Entry) => {
        if (isSymlink(e)) return reject(new ZipError("zip_symlink", e.fileName));
        const rel = safeRelative(e.fileName);
        if (rel === null) return reject(new ZipError("zip_unsafe_path", e.fileName));
        const isDir = e.fileName.endsWith("/");
        if (!isDir && rel && !ignored(e.fileName)) {
          total += e.uncompressedSize;
          out.push({ name: rel, size: e.uncompressedSize, isDir });
          if (out.length > MAX_FILES) return reject(new ZipError("zip_too_many_files"));
          if (total > MAX_TOTAL_BYTES) return reject(new ZipError("zip_too_large"));
        }
        zip.readEntry();
      });
      zip.on("end", resolve);
      zip.on("error", (err) => reject(new ZipError("zip_invalid", String(err))));
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
  return out;
}

function detectRoot(entries: Entry[]): string {
  const names = entries.map((e) => e.name);
  if (names.some((n) => n.toLowerCase() === "index.html")) return "";
  const tops = new Set(names.map((n) => n.split("/")[0]));
  if (tops.size === 1) {
    const top = [...tops][0];
    if (names.some((n) => n.toLowerCase() === `${top}/index.html`.toLowerCase())) return `${top}/`;
  }
  throw new ZipError("zip_no_index");
}

const extOf = (name: string) => {
  const base = name.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
};

const ignoredHosts = new Set(["www.w3.org", "w3.org", "schemas.xmlsoap.org", "ns.adobe.com", "purl.org", "www.apache.org", "opensource.org", "github.com", "creativecommons.org", "www.gnu.org", "gnu.org", "mozilla.org", "developer.mozilla.org", "reactjs.org", "fb.me"]);

const suspicious: [RegExp, string][] = [
  [/coinhive|coin-hive|cryptonight|cryptoloot|webminer|minero\.cc|monerominer|\bwebmr\b/i, "crypto_miner"],
  [/document\.cookie/, "reads_cookies"],
  [/\b(top|parent)\.location\b|window\.top\.location/, "frame_navigation"],
  [/\b(eval|Function)\s*\(\s*(atob|unescape|decodeURIComponent)\s*\(/, "obfuscated_eval"],
  [/<input[^>]+type\s*=\s*["']?password/i, "password_field"],
  [/<form[^>]+action\s*=\s*["']https?:\/\//i, "external_form"],
  [/navigator\.credentials|PaymentRequest\s*\(/, "credentials_or_payment_api"],
];

/**
 * Validate a developer zip and extract it to `destDir`.
 * Throws ZipError for anything we refuse to host.
 */
export async function extractGameZip(zipPath: string, destDir: string) {
  const entries = await listEntries(zipPath);
  if (entries.length === 0) throw new ZipError("zip_empty");
  const root = detectRoot(entries);

  const files: { path: string; size: number }[] = [];
  const badExt = new Set<string>();
  for (const e of entries) {
    if (!e.name.startsWith(root)) continue;
    const rel = e.name.slice(root.length);
    const ext = extOf(rel);
    const base = (rel.split("/").pop() ?? "").toLowerCase();
    if (base.startsWith(".")) continue; // dotfiles are dropped
    if (ext ? !allowedExt.has(ext) : !allowedBare.has(base.replace(/\.(md|txt)$/, ""))) {
      badExt.add(ext ? `.${ext}` : base);
      continue;
    }
    files.push({ path: rel, size: e.size });
  }
  if (badExt.size) throw new ZipError("zip_bad_files", [...badExt].slice(0, 10).join(", "));

  const wanted = new Map(files.map((f) => [root + f.path, f.path]));
  const tmpDir = `${destDir}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(tmpDir, { recursive: true });

  const hosts = new Set<string>();
  const warnings = new Set<string>();
  let totalBytes = 0;

  const zip = await openZip(zipPath);
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("entry", (e: yauzl.Entry) => {
        const rel = safeRelative(e.fileName);
        const target = rel !== null ? wanted.get(rel) : undefined;
        if (!target || e.fileName.endsWith("/")) return zip.readEntry();
        const outPath = path.join(tmpDir, target);
        if (!outPath.startsWith(tmpDir + path.sep)) return reject(new ZipError("zip_unsafe_path", e.fileName));
        zip.openReadStream(e, async (err, stream) => {
          if (err || !stream) return reject(new ZipError("zip_invalid", err?.message));
          try {
            await fs.mkdir(path.dirname(outPath), { recursive: true });
            const scan = textExt.has(extOf(target)) && e.uncompressedSize <= 3 * 1024 * 1024;
            const chunks: Buffer[] = [];
            const counter = new Transform({
              transform(chunk: Buffer, _enc, cb) {
                totalBytes += chunk.length;
                if (totalBytes > MAX_TOTAL_BYTES) return cb(new ZipError("zip_too_large"));
                if (scan) chunks.push(chunk);
                cb(null, chunk);
              },
            });
            await pipeline(stream, counter, createWriteStream(outPath, { flags: "wx" }));
            if (scan) {
              const text = Buffer.concat(chunks).toString("utf8");
              for (const m of text.matchAll(/(?:https?:)?\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[/:"'`\s)?#]|$)/gi)) {
                const h = m[1].toLowerCase();
                if (!ignoredHosts.has(h) && /\.[a-z]{2,}$/.test(h)) hosts.add(h);
              }
              for (const [re, code] of suspicious) if (re.test(text)) warnings.add(`${code}:${target}`);
            }
            zip.readEntry();
          } catch (e2) {
            reject(e2 instanceof ZipError ? e2 : new ZipError("zip_invalid", String(e2)));
          }
        });
      });
      zip.on("end", resolve);
      zip.on("error", (err) => reject(new ZipError("zip_invalid", String(err))));
      zip.readEntry();
    });
    await fs.rm(destDir, { recursive: true, force: true });
    await fs.rename(tmpDir, destDir);
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw err;
  } finally {
    zip.close();
  }

  const entry = files.find((f) => f.path.toLowerCase() === "index.html")!.path;
  files.sort((a, b) => a.path.localeCompare(b.path));
  const report: ScanReport = {
    fileCount: files.length,
    totalBytes,
    entry,
    externalHosts: [...hosts].sort().slice(0, 100),
    warnings: [...warnings].slice(0, 100),
  };
  return { files, report, entry };
}
