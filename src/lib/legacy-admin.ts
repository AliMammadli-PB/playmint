import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { paths } from "@/lib/env";
import { audit } from "@/lib/audit";
import type { LegacyFlashMeta, RightsStatus } from "@/lib/legacy-flash";
import { rejectVersion } from "@/lib/versions";

async function legacyVersion(versionId: string) {
  const version = (await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, versionId)))[0];
  if (!version?.report.legacyFlash) throw new Error("not_legacy");
  const game = (await db.select().from(schema.games).where(eq(schema.games.id, version.gameId)))[0];
  if (!game) throw new Error("not_legacy");
  return { version, game };
}

function withMeta(version: schema.GameVersion, patch: Partial<LegacyFlashMeta>) {
  return { ...version.report, legacyFlash: { ...version.report.legacyFlash!, ...patch } };
}

export async function markLegacyRights(versionId: string, actorId: string, rightsStatus: RightsStatus) {
  const { version } = await legacyVersion(versionId);
  await db.update(schema.gameVersions).set({ report: withMeta(version, { rightsStatus }) }).where(eq(schema.gameVersions.id, versionId));
  await audit(actorId, `legacy.rights.${rightsStatus}`, version.gameId, {
    sourceRepository: version.report.legacyFlash!.sourceRepository,
    sourceFile: version.report.legacyFlash!.sourceFile,
    sourceSha: version.report.legacyFlash!.sourceSha,
  });
}

export async function markLegacyTechnical(versionId: string, actorId: string) {
  const { version } = await legacyVersion(versionId);
  if (version.status !== "pending") throw new Error("not_pending");
  await db.update(schema.gameVersions).set({ report: withMeta(version, { technicalStatus: "approved" }) }).where(eq(schema.gameVersions.id, versionId));
  await audit(actorId, "legacy.technical.approved", version.gameId, { sourceSha: version.report.legacyFlash!.sourceSha });
}

export async function rejectLegacyImport(versionId: string, actorId: string, note: string) {
  const { version } = await legacyVersion(versionId);
  await db.update(schema.gameVersions).set({ report: withMeta(version, { rightsStatus: "rejected", technicalStatus: "rejected" }) }).where(eq(schema.gameVersions.id, versionId));
  await rejectVersion(versionId, actorId, note, "manual");
  await audit(actorId, "legacy.rejected", version.gameId, { note, sourceSha: version.report.legacyFlash!.sourceSha });
}

export async function deleteLegacyImport(versionId: string, actorId: string) {
  const { version, game } = await legacyVersion(versionId);
  if (game.status === "published" || game.liveVersionId) throw new Error("published");
  await fs.rm(version.filesDir, { recursive: true, force: true });
  if (version.projectDir) await fs.rm(version.projectDir, { recursive: true, force: true });
  await fs.rm(version.sourceZipPath, { force: true });
  if (game.coverPath) await fs.rm(path.join(paths.covers(), path.basename(game.coverPath)), { force: true });
  await db.delete(schema.games).where(eq(schema.games.id, game.id));
  await audit(actorId, "legacy.deleted", game.id, { title: game.title, sourceSha: version.report.legacyFlash!.sourceSha });
}
