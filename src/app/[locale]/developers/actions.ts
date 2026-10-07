"use server";

import { redirect } from "next/navigation";
import { eq,ne,and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { handleRe } from "@/lib/catalog";
import { audit } from "@/lib/audit";

export type BecomeDevState = { error?: string; handle?: string; displayName?: string } | null;

export async function becomeDeveloperAction(_prev: BecomeDevState, form: FormData): Promise<BecomeDevState> {
  const locale: Locale = isLocale(form.get("locale")) ? (form.get("locale") as Locale) : "tr";
  const t = getDict(locale).devLanding;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/developers`);
  const handle = String(form.get("handle") ?? "").trim().toLowerCase();
  const displayName = String(form.get("displayName") ?? "").trim().slice(0, 60);
  const keep = { handle, displayName };
  if (!handleRe.test(handle)) return { error: t.handleInvalid, ...keep };
  if (!displayName) return { error: t.handleInvalid, ...keep };
  if (form.get("accept") !== "on") return { error: t.acceptRequired, ...keep };
  const taken = await db.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.handle, handle));
  if (taken.length && taken[0].userId !== user.id) return { error: t.handleTaken, ...keep };

  const reserved=await db.select({id:schema.users.id}).from(schema.users).where(and(eq(schema.users.username,handle),ne(schema.users.id,user.id)));
  if(reserved.length)return {error:t.handleTaken,...keep};
  try{await db.transaction(async tx=>{
    await tx.insert(schema.developerProfiles).values({userId:user.id,handle,displayName}).onConflictDoUpdate({target:schema.developerProfiles.userId,set:{handle,displayName}});
    await tx.update(schema.users).set({username:handle,role:user.role==="player"?"developer":user.role}).where(eq(schema.users.id,user.id));
  });}catch(err){const e=err as {code?:string;cause?:{code?:string}};if(e.code==="23505"||e.cause?.code==="23505")return {error:t.handleTaken,...keep};throw err;}
  await audit(user.id, "developer.join", handle);
  redirect(`/${locale}/dev`);
}
