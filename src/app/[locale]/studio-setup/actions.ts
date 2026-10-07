"use server";
import {createHash,timingSafeEqual} from "node:crypto";
import {redirect} from "next/navigation";
import {eq,sql} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
import {isLocale} from "@/lib/i18n/config";
import {audit} from "@/lib/audit";
export async function claimAdmin(form:FormData) {
 const l=form.get("locale"),locale=isLocale(l)?l:"tr";
 const user=await getCurrentUser();if(!user)redirect(`/${locale}/login`);
 const token=String(form.get("token")??"");if(!/^[a-f0-9]{64}$/.test(token))return;
 const ok=await db.transaction(async tx=>{
  const row=(await tx.select().from(schema.settings).where(eq(schema.settings.key,"adminBootstrap")).for("update"))[0];
  const value=row?.value as {hash?:string;expiresAt?:number}|undefined;
  if(!value?.hash||!value.expiresAt||value.expiresAt<Date.now())return false;
  const actual=createHash("sha256").update(token).digest("hex");
  if(value.hash.length!==actual.length||!timingSafeEqual(Buffer.from(value.hash),Buffer.from(actual)))return false;
  const existing=await tx.select({id:schema.users.id}).from(schema.users).where(eq(schema.users.role,"admin")).limit(1);
  if(existing.length)return false;
  await tx.update(schema.users).set({role:"admin"}).where(eq(schema.users.id,user.id));
  await tx.delete(schema.settings).where(eq(schema.settings.key,"adminBootstrap"));return true;
 });
 if(!ok)redirect(`/${locale}`);
 await audit(user.id,"admin.bootstrap",user.id);
 redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4`);
}
