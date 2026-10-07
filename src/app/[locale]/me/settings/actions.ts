"use server";
import {and,eq,ne} from "drizzle-orm";
import {revalidatePath} from "next/cache";
import {db,schema} from "@/lib/db";
import {cookies} from "next/headers";
import {createHash} from "node:crypto";
import {getCurrentUser,sessionCookie} from "@/lib/auth";
import {hashPassword,verifyPassword} from "@/lib/password";
import {isLocale} from "@/lib/i18n/config";
import {rateLimit} from "@/lib/rate-limit";
import {redirect} from "next/navigation";
export type AccountState={error?:string;ok?:boolean}|null;
export async function saveAccount(_prev:AccountState,form:FormData):Promise<AccountState>{const user=await getCurrentUser();if(!user)return {error:"Forbidden"};const l=form.get("locale"),locale=isLocale(l)?l:"tr",en=locale==="en",az=locale==="az";if(!rateLimit(`account:${user.id}`,10,60000))return {error:en?"Try again shortly.":"Biraz sonra tekrar dene."};const name=String(form.get("name")??"").trim().slice(0,60);if(!name)return {error:en?"Enter your name.":az?"Adını daxil et.":"Adını gir."};const password=String(form.get("password")??""),confirm=String(form.get("passwordConfirm")??"");const patch:{name:string;passwordHash?:string}={name};if(password||confirm){if(password.length<8||password.length>128||password!==confirm)return {error:en?"New passwords must match and contain 8–128 characters.":az?"Yeni şifrələr eyni və 8–128 simvol olmalıdır.":"Yeni şifreler eşleşmeli ve 8–128 karakter olmalı."};const record=(await db.select({hash:schema.users.passwordHash}).from(schema.users).where(eq(schema.users.id,user.id)))[0];if(!record||!await verifyPassword(record.hash,String(form.get("currentPassword")??"")))return {error:en?"Current password is incorrect.":az?"Mövcud şifrə səhvdir.":"Mevcut şifre yanlış."};patch.passwordHash=await hashPassword(password);}const sessionToken=(await cookies()).get(sessionCookie)?.value??"";
await db.transaction(async tx=>{await tx.update(schema.users).set(patch).where(eq(schema.users.id,user.id));if(patch.passwordHash)await tx.delete(schema.sessions).where(and(eq(schema.sessions.userId,user.id),ne(schema.sessions.id,createHash("sha256").update(sessionToken).digest("hex"))));});
revalidatePath(`/${locale}`,"layout");return {ok:true};}
export async function cancelPlayerSubscription(form:FormData){const user=await getCurrentUser();if(!user)return;const l=form.get("locale"),locale=isLocale(l)?l:"tr";await db.update(schema.subscriptions).set({cancelAtPeriodEnd:true}).where(and(eq(schema.subscriptions.id,String(form.get("subscriptionId")??"")),eq(schema.subscriptions.userId,user.id),eq(schema.subscriptions.status,"active")));redirect(`/${locale}/me/subscriptions`);}
