import {scanVersion} from "@/lib/virustotal";
import {after} from "next/server";
import {getUpload,queueUpload,UploadError} from "@/lib/upload-store";
import {processUpload} from "@/lib/upload-jobs";
import { crossOrigin } from "@/lib/origin";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { isLocale } from "@/lib/i18n/config";
import { createVersion } from "@/lib/versions";
import { getSettings } from "@/lib/settings";
import { ZipError } from "@/lib/zip";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const maxDuration=600;

/** Upload a new version of an existing game. */
export async function POST(req: Request, ctx: RouteContext<"/api/dev/games/[id]/versions">) {
  if (crossOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData();
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as "tr") : "tr";
  const t = getDict(locale);
  const owner = user.role === "admin" ? undefined : eq(schema.games.developerId, user.id);
  const game = (await db.select().from(schema.games).where(and(eq(schema.games.id, id), owner)))[0];
  if (!game) return Response.json({ error: t.dev.errors.not_found }, { status: 404 });
  if (!rateLimit(`upload:${user.id}`, 20, 3600_000)) return Response.json({ error: t.common.rateLimited }, { status: 429 });
  if (game.license!=="Developer" && form.get("openSource") !== "on") return Response.json({ error: t.dev.errors.openSourceRequired }, { status: 400 });
  const uploadId=String(form.get("uploadId")??"");
  if(uploadId){try{const record=await getUpload(uploadId,user.id);if(record.status!=="ready")return Response.json({error:"not_ready"},{status:409});}catch(e){return Response.json({error:e instanceof UploadError?e.code:"error"},{status:e instanceof UploadError?e.status:500});}}
  const zip = form.get("zip");
  if (!uploadId && !(zip instanceof File)) return Response.json({ error: t.dev.errors.zip_missing }, { status: 400 });
  const settings = await getSettings();
  if(uploadId){try{await queueUpload(uploadId,user.id,{gameId:game.id,isNew:false,locale,changelog:String(form.get("changelog")??""),maxZipMb:settings.maxZipMb});after(()=>processUpload(uploadId,user.id));return Response.json({ok:true,pending:true,uploadId,gameId:game.id},{status:202});}catch(e){return Response.json({error:e instanceof UploadError?e.code:t.common.error},{status:e instanceof UploadError?e.status:500});}}

  try {
    const versionId = await createVersion(game.id, zip as File, String(form.get("changelog") ?? ""), settings.maxZipMb);
    after(()=>scanVersion(versionId));
    await audit(user.id, "version.upload", versionId, { gameId: game.id });
    return Response.json({ ok: true, versionId });
  } catch (err) {
    if (err instanceof ZipError) {
      const msg = (t.dev.errors as Record<string, string>)[err.code] ?? t.common.error;
      return Response.json({ error: fill(msg, { detail: err.detail }) }, { status: 400 });
    }
    console.error("version upload failed", err);
    return Response.json({ error: t.common.error }, { status: 500 });
  }
}
