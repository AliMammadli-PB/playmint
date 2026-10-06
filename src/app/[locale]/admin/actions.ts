"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { approveVersion, rejectVersion } from "@/lib/versions";
import { extendSubscription } from "@/lib/payments";
import { saveDraftPeriod, finalizePeriod } from "@/lib/finance";
import { saveSettings, defaultSettings, type Settings } from "@/lib/settings";
import { audit } from "@/lib/audit";

async function admin(form: FormData) {
  const locale: Locale = isLocale(form.get("locale")) ? (form.get("locale") as Locale) : "tr";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect(`/${locale}`);
  return { user, locale };
}
const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function reviewAction(form: FormData) {
  const { user, locale } = await admin(form);
  const versionId = str(form, "versionId");
  const note = str(form, "note").slice(0, 2000);
  const decision = str(form, "decision");
  if (decision === "approve") {
    await approveVersion(versionId, user.id, note);
  } else if (decision === "reject") {
    if (!note) redirect(`/${locale}/admin/review/${versionId}?error=note`);
    await rejectVersion(versionId, user.id, note);
  }
  await audit(user.id, `version.${decision}`, versionId, { note });
  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/review`);
}

export async function gameAdminAction(form: FormData) {
  const { user, locale } = await admin(form);
  const gameId = str(form, "gameId");
  const op = str(form, "op");
  const set: Partial<typeof schema.games.$inferInsert> = {};
  if (op === "feature") set.featured = true;
  if (op === "unfeature") set.featured = false;
  if (op === "premium") set.premiumOnly = true;
  if (op === "free") set.premiumOnly = false;
  if (op === "unlist") set.status = "unlisted";
  if (op === "remove") set.status = "removed";
  if (op === "publish") set.status = "published";
  if (Object.keys(set).length) {
    await db.update(schema.games).set(set).where(eq(schema.games.id, gameId));
    await audit(user.id, `game.${op}`, gameId);
  }
  revalidatePath(`/${locale}/admin/games`);
}

export async function userAdminAction(form: FormData) {
  const { user, locale } = await admin(form);
  const userId = str(form, "userId");
  const op = str(form, "op");
  if (userId === user.id && (op === "ban" || op.startsWith("role:"))) return;
  if (op === "ban" || op === "unban") {
    await db.update(schema.users).set({ banned: op === "ban" }).where(eq(schema.users.id, userId));
    if (op === "ban") await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  } else if (op.startsWith("role:")) {
    const role = op.slice(5);
    if (role === "player" || role === "developer" || role === "admin") {
      await db.update(schema.users).set({ role }).where(eq(schema.users.id, userId));
    }
  } else if (op === "grant") {
    await extendSubscription(userId, "grant");
  }
  await audit(user.id, `user.${op}`, userId);
  revalidatePath(`/${locale}/admin/users`);
}

export async function periodAction(form: FormData) {
  const { user, locale } = await admin(form);
  const month = str(form, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const op = str(form, "op");
  try {
    if (op === "compute") await saveDraftPeriod(month);
    if (op === "finalize") await finalizePeriod(month);
  } catch (e) {
    redirect(`/${locale}/admin/finance?error=${encodeURIComponent((e as Error).message)}`);
  }
  await audit(user.id, `period.${op}`, month);
  revalidatePath(`/${locale}/admin/finance`);
}

export async function payoutAction(form: FormData) {
  const { user, locale } = await admin(form);
  const id = str(form, "payoutId");
  const op = str(form, "op");
  if (op !== "paid" && op !== "rejected") return;
  await db
    .update(schema.payouts)
    .set({ status: op, reference: str(form, "reference").slice(0, 200), note: str(form, "note").slice(0, 500), processedAt: new Date() })
    .where(and(eq(schema.payouts.id, id), eq(schema.payouts.status, "requested")));
  await audit(user.id, `payout.${op}`, id);
  revalidatePath(`/${locale}/admin/finance`);
}

export async function settingsAction(form: FormData) {
  const { user, locale } = await admin(form);
  const n = (k: string, fallback: number, min: number, max: number) => {
    const v = Number(str(form, k).replace(",", "."));
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  };
  const d = defaultSettings;
  const patch: Partial<Settings> = {
    devShareBps: Math.round(n("devShare", d.devShareBps / 100, 0, 100) * 100),
    premiumPriceCents: Math.round(n("price", d.premiumPriceCents / 100, 0.5, 1000) * 100),
    currency: /^[A-Z]{3}$/.test(str(form, "currency")) ? str(form, "currency") : d.currency,
    paymentFeeBps: Math.round(n("fee", 0, 0, 50) * 100),
    minPayoutCents: Math.round(n("minPayout", d.minPayoutCents / 100, 0, 100000) * 100),
    holdDays: Math.round(n("holdDays", d.holdDays, 0, 365)),
    dailyCapSeconds: Math.round(n("dailyCap", d.dailyCapSeconds / 3600, 0.5, 24) * 3600),
    likeBonus: n("likeBonus", d.likeBonus * 100, 0, 100) / 100,
    maxZipMb: Math.round(n("maxZip", d.maxZipMb, 1, 500)),
  };
  await saveSettings(patch);
  await audit(user.id, "settings.update", "", patch);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/admin/settings?saved=1`);
}
