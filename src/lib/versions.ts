import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {constants} from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { paths,gameFilesBase } from "@/lib/env";
import {scanAllowsApproval} from "@/lib/virustotal-result";
import {removeScanArchive} from "@/lib/virustotal";
import {archiveHash} from "@/lib/archive-hash";
import { retainRuntimeOnly } from "@/lib/version-retention";
import { newId } from "@/lib/ids";
import { extractGameZip, rebaseGameAssets, ZipError } from "@/lib/zip";

/** Store + validate an uploaded zip and create a pending version. Throws ZipError. */
export async function createVersion(gameId: string, zip: File | {archivePath:string;size:number;versionId?:string;archiveSha256?:string}, changelog: string, maxZipMb: number) {
  if (zip.size === 0) throw new ZipError("zip_missing");
  if (zip.size > maxZipMb * 1024 * 1024) throw new ZipError("file_too_big");
  const id = "archivePath" in zip && zip.versionId ? zip.versionId : newId();
  if("archivePath" in zip && zip.versionId){const existing=(await db.select({id:schema.gameVersions.id,gameId:schema.gameVersions.gameId}).from(schema.gameVersions).where(eq(schema.gameVersions.id,id)))[0];if(existing){if(existing.gameId!==gameId)throw new ZipError("zip_invalid");return id;}}

  await fs.mkdir(paths.sources(), { recursive: true });
  await fs.mkdir(paths.games(), { recursive: true });
  const zipPath = path.join(paths.sources(), `${id}.zip`);
  const filesDir = path.join(paths.games(), id);
  const projectDir=path.join(paths.projects(),id);
  await fs.mkdir(paths.projects(),{recursive:true});
  if("archivePath" in zip)await fs.copyFile(zip.archivePath,zipPath,constants.COPYFILE_FICLONE);
  else await fs.writeFile(zipPath, Buffer.from(await zip.arrayBuffer()));
  let result;
  try {
    result = await extractGameZip(zipPath, filesDir,projectDir);
    result.report.virustotal={status:"pending",updatedAt:new Date().toISOString()};
    result.report.archiveSha256="archivePath" in zip && zip.archiveSha256 ? zip.archiveSha256 : await archiveHash(zipPath);
    if(result.runtimeKind==="browser")await rebaseGameAssets(filesDir,result.runtimeFiles,`${gameFilesBase()}/${id}`);
  } catch (err) {
    await fs.rm(zipPath, { force: true });
    await fs.rm(projectDir,{recursive:true,force:true});
    await fs.rm(filesDir,{recursive:true,force:true});
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
    if(v.projectDir)await fs.rm(v.projectDir,{recursive:true,force:true});
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
    projectDir,
    runtimeKind:result.runtimeKind,
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
    if(v.runtimeKind!=="browser"||!v.entry)throw new Error("runtime_not_ready");
    if(!scanAllowsApproval(v.report.virustotal))throw new Error("scan_not_passed");
    const ownerGame=(await tx.select().from(schema.games).where(eq(schema.games.id,v.gameId)))[0];
    if(!ownerGame?.coverPath)throw new Error("cover_required");
    await removeScanArchive(v.id);
    // Keep the private archive until review; approval requires successful cleanup.
    const runtimeFiles = await retainRuntimeOnly(v);
    const game = (await tx.select().from(schema.games).where(eq(schema.games.id, v.gameId)))[0];
    if (game.liveVersionId) {
      await tx.update(schema.gameVersions).set({ status: "superseded" }).where(eq(schema.gameVersions.id, game.liveVersionId));
    }
    await tx
      .update(schema.gameVersions)
      .set({ status: "approved", projectDir: null, files: runtimeFiles, report: {...v.report, sourceRemovedAt: new Date().toISOString()}, reviewNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
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

export async function rejectVersion(versionId: string, reviewerId: string, note: string, reason: "virustotal"|"manual"="manual") {
  await db
    .update(schema.gameVersions)
    .set({ report:sql`jsonb_set(${schema.gameVersions.report},'{rejectionReason}',${JSON.stringify(reason)}::jsonb)`, status: "rejected", reviewNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
    .where(and(eq(schema.gameVersions.id, versionId), eq(schema.gameVersions.status, "pending")));
}
