import {scanVersion} from "@/lib/virustotal";
import {after} from "next/server";
import {getUpload,queueUpload,UploadError} from "@/lib/upload-store";
import {processUpload} from "@/lib/upload-jobs";
import { crossOrigin } from "@/lib/origin";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { isLocale } from "@/lib/i18n/config";
import { parseGameMeta, saveCover } from "@/lib/game-form";
import { createVersion } from "@/lib/versions";
import { getSettings } from "@/lib/settings";
import {isCategory} from "@/lib/catalog";
import {parseSupport} from "@/lib/game-capabilities";
import {slugify} from "@/lib/catalog";
import type {GameMeta} from "@/lib/game-form";
import { newId } from "@/lib/ids";
import { ZipError } from "@/lib/zip";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const maxDuration=600;

/** Create a new game with its first version (multipart: metadata + zip + optional cover). */
export async function POST(req: Request) {
  if (crossOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || (user.role !== "developer" && user.role !== "admin")) return Response.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData();
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as "tr"|"az"|"en") : "tr";
  const t = getDict(locale);
  if (!rateLimit(`upload:${user.id}`, 20, 3600_000)) return Response.json({ error: t.common.rateLimited }, { status: 429 });

  const submittedUpload=String(form.get("uploadId")??"");
  if(submittedUpload){
    try{
      const record=await getUpload(submittedUpload,user.id);
      if(record.job?.isNew && ['queued','processing','done'].includes(record.status)){
        if(record.status!=='done')after(()=>processUpload(submittedUpload,user.id));
        return Response.json({ok:true,pending:record.status!=='done',uploadId:submittedUpload,gameId:record.job.gameId,versionId:record.versionId,status:record.status},{status:record.status==='done'?200:202});
      }
    }catch(e){return Response.json({error:e instanceof UploadError?e.code:t.common.error},{status:e instanceof UploadError?e.status:500});}
  }

  let meta:GameMeta;
  if(form.get("simpleUpload")==="on"){
    const title=String(form.get("title")??"").trim();
    if(!title||title.length>60)return Response.json({error:t.dev.errors.titleRequired},{status:400});
    const category=form.get("category");if(!isCategory(category))return Response.json({error:t.dev.errors.categoryInvalid},{status:400});
    let mobileResponsive:boolean|null,fullscreenSupported:boolean|null;
    try{mobileResponsive=parseSupport(form.get("mobileResponsive"),true);fullscreenSupported=parseSupport(form.get("fullscreenSupported"),true);}catch{return Response.json({error:locale==="en"?"Choose mobile and fullscreen support.":"Mobil ve tam ekran desteğini seç."},{status:400});}
    const suffix=newId().slice(0,8);const base=slugify(title).slice(0,29)||"game";
    meta={title,slug:`${base}-${suffix}`,category,mobileResponsive,fullscreenSupported,tagline:{tr:title,az:title,en:title},description:{},tags:[],license:"Developer",orientation:["landscape","portrait","any"].includes(String(form.get("orientation")))?String(form.get("orientation")):"landscape",premiumOnly:false,subscriptionPriceCents:0,subscriptionCurrency:"USD",subscriptionBenefits:"",rewardedAds:false};
  }else{
    const parsed=parseGameMeta(form,t);if("error" in parsed)return Response.json({error:parsed.error},{status:400});
    if(form.get("openSource")!=="on")return Response.json({error:t.dev.errors.openSourceRequired},{status:400});
    meta=parsed.meta;
  }
  const taken=await db.select({id:schema.games.id}).from(schema.games).where(eq(schema.games.slug,meta.slug));
  if(taken.length)return Response.json({error:t.dev.errors.slugTaken},{status:400});
  const uploadId=String(form.get("uploadId")??"");
  if(uploadId){try{const record=await getUpload(uploadId,user.id);if(record.status!=="ready")return Response.json({error:"not_ready"},{status:409});}catch(e){return Response.json({error:e instanceof UploadError?e.code:"error"},{status:e instanceof UploadError?e.status:500});}}
  const zip = form.get("zip");
  if (!uploadId && !(zip instanceof File)) return Response.json({ error: t.dev.errors.zip_missing }, { status: 400 });

  const gameId = newId();
  const cover = await saveCover(form.get("cover"), gameId);
  if (!cover) return Response.json({error:locale==="en"?"A game cover is required.":locale==="az"?"Oyun üz qabığı tələb olunur.":"Oyun kapağı zorunludur."},{status:400});
  if (cover === "invalid") return Response.json({ error: t.dev.errors.cover_invalid }, { status: 400 });

  await db.insert(schema.games).values({ id: gameId, developerId: user.id, ...meta, coverPath: cover });
  const settings = await getSettings();
  if(uploadId){try{await queueUpload(uploadId,user.id,{gameId,isNew:true,locale,changelog:String(form.get("changelog")??""),maxZipMb:settings.maxZipMb});after(()=>processUpload(uploadId,user.id));return Response.json({ok:true,pending:true,uploadId,gameId},{status:202});}catch(e){await db.delete(schema.games).where(eq(schema.games.id,gameId));return Response.json({error:e instanceof UploadError?e.code:t.common.error},{status:e instanceof UploadError?e.status:500});}}

  try {
    const versionId=await createVersion(gameId, zip as File, String(form.get("changelog") ?? ""), settings.maxZipMb);
    after(()=>scanVersion(versionId));
  } catch (err) {
    await db.delete(schema.games).where(eq(schema.games.id, gameId));
    if (err instanceof ZipError) {
      const msg = (t.dev.errors as Record<string, string>)[err.code] ?? t.common.error;
      return Response.json({ error: fill(msg, { detail: err.detail }) }, { status: 400 });
    }
    console.error("upload failed", err);
    return Response.json({ error: t.common.error }, { status: 500 });
  }
  await audit(user.id, "game.create", gameId, { slug: meta.slug });
  return Response.json({ ok: true, gameId });
}
