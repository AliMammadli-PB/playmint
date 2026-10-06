import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { paths } from "@/lib/env";
import { newId } from "@/lib/ids";
import { extractGameZip, ZipError } from "@/lib/zip";

/** Store + validate an uploaded zip and create a pending version. Throws ZipError. */
export async function createVersion(gameId: string, zip: File, changelog: string, maxZipMb: number) {
  if (zip.size === 0) throw new ZipError("zip_missing");
  if (zip.size > maxZipMb * 1024 * 1024) throw new ZipError("file_too_big");
  const id = newId();
  await fs.mkdir(paths.sources(), { recursive: true });
  await fs.mkdir(paths.games(), { recursive: true });
  const zipPath = path.join(paths.sources(), `${id}.zip`);
  const filesDir = path.join(paths.games(), id);
  await fs.writeFile(zipPath, Buffer.from(await zip.arrayBuffer()));
  let result;
  try {
    result = await extractGameZip(zipPath, filesDir);
  } catch (err) {
    await fs.rm(zipPath, { force: true });
    throw err;
  }

  // A newer upload replaces any version still waiting for review.
  const stale = await db
    .select()
    .from(schema.gameVersions)
    .where(and(eq(schema.gameVersions.gameId, gameId), eq(schema.gameVersions.status, "pending")));
  for (const v of stale) {
    await db.delete(schema.gameVersions).where(eq(schema.gameVersions.id, v.id));
    await fs.rm(v.filesDir, { recursive: true, force: true });
    await fs.rm(v.sourceZipPath, { force: true });
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${schema.gameVersions.number}), 0)::int + 1` })
    .from(schema.gameVersions)
    .where(eq(schema.gameVersions.gameId, gameId));
  await db.insert(schema.gameVersions).values({
    id,
    gameId,
    number: next,
    changelog: changelog.slice(0, 2000),
    sourceZipPath: zipPath,
    filesDir,
    entry: result.entry,
    files: result.files,
    report: result.report,
  });
  return id;
}

export async function approveVersion(versionId: string, reviewerId: string, note: string) {
  await db.transaction(async (tx) => {
    const v = (await tx.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, versionId)).for("update"))[0];
    if (!v || v.status !== "pending") throw new Error("not_pending");
    const game = (await tx.select().from(schema.games).where(eq(schema.games.id, v.gameId)))[0];
    if (game.liveVersionId) {
      await tx.update(schema.gameVersions).set({ status: "superseded" }).where(eq(schema.gameVersions.id, game.liveVersionId));
    }
    await tx
      .update(schema.gameVersions)
      .set({ status: "approved", reviewNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
      .where(eq(schema.gameVersions.id, versionId));
    await tx
      .update(schema.games)
      .set({
        liveVersionId: versionId,
        status: game.status === "draft" ? "published" : game.status,
        publishedAt: game.publishedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.games.id, game.id));
  });
}

export async function rejectVersion(versionId: string, reviewerId: string, note: string) {
  await db
    .update(schema.gameVersions)
    .set({ status: "rejected", reviewNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
    .where(and(eq(schema.gameVersions.id, versionId), eq(schema.gameVersions.status, "pending")));
}
