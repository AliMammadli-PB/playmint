"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import {normalizeIban,validTrIban} from "@/lib/bank-money";
import {requestBankPayout} from "@/lib/ad-ledger";
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
  await db
    .update(schema.developerProfiles)
    .set({
      displayName,
      bio: str(form, "bio", 1000),
      website: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
    })
    .where(eq(schema.developerProfiles.userId, user.id));
  revalidatePath(`/${locale}/dev/settings`);
  return { ok: true };
}

export async function saveIbanAction(_prev: DevSettingsState, form: FormData): Promise<DevSettingsState> {
  const locale = localeOf(form);
  const user = await getCurrentUser();
  if (!user || (user.role !== "developer" && user.role !== "admin")) return { error: getDict(locale).common.error };
  const iban = normalizeIban(str(form, "payoutDetails", 42));
  const payoutName = str(form, "payoutName", 100);
  if (!validTrIban(iban) || !payoutName) {
    return { error: locale === "en" ? "Enter a valid Turkish IBAN and the account holder name." : locale === "az" ? "Düzgün TR IBAN və hesab sahibinin adını yaz." : "Geçerli bir TR IBAN ve hesap sahibi adı gir." };
  }
  await db.update(schema.developerProfiles).set({ payoutMethod: "iban", payoutName, payoutDetails: iban }).where(eq(schema.developerProfiles.userId, user.id));
  revalidatePath(`/${locale}/dev/settings`);
  revalidatePath(`/${locale}/dev/earnings`);
  return { ok: true };
}

export async function requestPayoutAction(form: FormData) {
  const locale = localeOf(form);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  try{const id=await requestBankPayout(user.id);await audit(user.id,"payout.request",id);}catch(e){redirect(`/${locale}/dev/earnings?error=${e instanceof Error?encodeURIComponent(e.message):"error"}`);}
  redirect(`/${locale}/dev/earnings?requested=1`);
}
