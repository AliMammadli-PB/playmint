"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
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

  await db
    .insert(schema.developerProfiles)
    .values({ userId: user.id, handle, displayName })
    .onConflictDoUpdate({ target: schema.developerProfiles.userId, set: { handle, displayName } });
  if (user.role === "player") await db.update(schema.users).set({ role: "developer" }).where(eq(schema.users.id, user.id));
  await audit(user.id, "developer.join", handle);
  redirect(`/${locale}/dev`);
}
