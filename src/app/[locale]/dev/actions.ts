"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { developerBalance } from "@/lib/finance";
import { newId } from "@/lib/ids";
import { audit } from "@/lib/audit";

export type DevSettingsState = { error?: string; ok?: boolean } | null;

const localeOf = (form: FormData): Locale => (isLocale(form.get("locale")) ? (form.get("locale") as Locale) : "tr");
const str = (form: FormData, k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);

export async function saveDevSettingsAction(_prev: DevSettingsState, form: FormData): Promise<DevSettingsState> {
  const locale = localeOf(form);
  const t = getDict(locale);
  const user = await getCurrentUser();
  if (!user || (user.role !== "developer" && user.role !== "admin")) return { error: t.common.error };
  const displayName = str(form, "displayName", 60);
  if (!displayName) return { error: t.devLanding.handleInvalid };
  const website = str(form, "website", 200);
  const method = str(form, "payoutMethod", 10);
  await db
    .update(schema.developerProfiles)
    .set({
      displayName,
      bio: str(form, "bio", 1000),
      website: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
      payoutMethod: ["iban", "paypal", "wise"].includes(method) ? method : "",
      payoutName: str(form, "payoutName", 100),
      payoutDetails: str(form, "payoutDetails", 200),
    })
    .where(eq(schema.developerProfiles.userId, user.id));
  revalidatePath(`/${locale}/dev/settings`);
  return { ok: true };
}

export async function requestPayoutAction(form: FormData) {
  const locale = localeOf(form);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const profile = (await db.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.userId, user.id)))[0];
  const balance = await developerBalance(user.id);
  if (!profile?.payoutMethod || !profile.payoutDetails) redirect(`/${locale}/dev/settings`);
  if (balance.availableCents < balance.minPayoutCents) redirect(`/${locale}/dev/earnings`);
  await db.insert(schema.payouts).values({
    id: newId(),
    developerId: user.id,
    amountCents: balance.availableCents,
    currency: balance.currency,
    method: profile.payoutMethod,
    details: `${profile.payoutName} · ${profile.payoutDetails}`,
  });
  await audit(user.id, "payout.request", "", { amount: balance.availableCents });
  redirect(`/${locale}/dev/earnings?requested=1`);
}
