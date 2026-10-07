"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { approveVersion, rejectVersion } from "@/lib/versions";
import { legacyRightsBlockPublish } from "@/lib/legacy-flash";
import { deleteLegacyImport, markLegacyRights, markLegacyTechnical, rejectLegacyImport } from "@/lib/legacy-admin";
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
  let note = str(form, "note").slice(0, 2000);
  const decision = str(form, "decision");
  if (decision === "approve") {
    try{await approveVersion(versionId, user.id, note);}catch(e){if(e instanceof Error&&['scan_not_passed','cover_required','rights_not_verified'].includes(e.message))redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review/${versionId}?error=${e.message==='rights_not_verified'?'rights':'scan'}`);throw e;}
  } else if (decision === "reject") {
    if(str(form,"reason")==="virustotal"){
      const version=(await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id,versionId)))[0];
      const scan=version?.report.virustotal;
      if(scan?.stats&&((scan.stats.malicious??0)+(scan.stats.suspicious??0)>0)){const prefix=locale==="en"?"Rejected due to VirusTotal findings":locale==="az"?"VirusTotal nəticələrinə görə rədd edildi":"VirusTotal bulguları nedeniyle reddedildi";note=[`${prefix}: ${scan.stats.malicious??0} malicious, ${scan.stats.suspicious??0} suspicious.`,...(scan.detections??[]).slice(0,10).map(d=>`${d.engine}: ${d.result}`),note].filter(Boolean).join("\n").slice(0,2000);}
    }
    if (!note) redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review/${versionId}?error=note`);
    await rejectVersion(versionId, user.id, note,str(form,"reason")==="virustotal"?"virustotal":"manual");
  }
  revalidatePath(`/${locale}/dev`, "layout");
  await audit(user.id, `version.${decision}`, versionId, { note });
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4`, "layout");
  redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review`);
}

export async function gameAdminAction(form: FormData) {
  const { user, locale } = await admin(form);
  const gameId = str(form, "gameId");
  const op = str(form, "op");
  const set: Partial<typeof schema.games.$inferInsert> = {};
  if (op === "feature") set.featured = true;
  if (op === "unfeature") set.featured = false;
  if (op === "unlist") set.status = "unlisted";
  if (op === "remove") set.status = "removed";
  if (op === "publish") {
    const game = (await db.select().from(schema.games).where(eq(schema.games.id, gameId)))[0];
    const live = game?.liveVersionId ? (await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, game.liveVersionId)))[0] : undefined;
    if (!legacyRightsBlockPublish(live?.report)) set.status = "published";
  }
  if (Object.keys(set).length) {
    await db.update(schema.games).set(set).where(eq(schema.games.id, gameId));
    await audit(user.id, `game.${op}`, gameId);
  }
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/games`);
}

export async function legacyAction(form: FormData) {
  const { user, locale } = await admin(form);
  const versionId = str(form, "versionId");
  const op = str(form, "op");
  const back = `/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/legacy`;
  if (op === "reject" && !str(form, "note")) redirect(`${back}?error=note`);
  try {
    if (op === "technical") await markLegacyTechnical(versionId, user.id);
    else if (op === "rights") await markLegacyRights(versionId, user.id, "verified");
    else if (op === "reject") await rejectLegacyImport(versionId, user.id, str(form, "note"));
    else if (op === "delete") await deleteLegacyImport(versionId, user.id);
    else if (op === "publish") await approveVersion(versionId, user.id, str(form, "note"));
  } catch (error) {
    const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest: unknown }).digest) : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;
    const code = error instanceof Error ? error.message : "failed";
    redirect(`${back}?error=${encodeURIComponent(code)}`);
  }
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4`, "layout");
  redirect(back);
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
  }
  await audit(user.id, `user.${op}`, userId);
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/users`);
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
    redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/finance?error=${encodeURIComponent((e as Error).message)}`);
  }
  await audit(user.id, `period.${op}`, month);
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/finance`);
  revalidatePath(`/${locale}/dev`,"layout");
}

export async function payoutAction(form: FormData) {
  const { user, locale } = await admin(form);
  const id = str(form, "payoutId");
  const op = str(form, "op");
  if (op !== "paid" && op !== "rejected") return;
  const reference=str(form,"reference").slice(0,200),note=str(form,"note").slice(0,500);
  if((op==="paid"&&!reference)||(op==="rejected"&&!note))redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/finance?error=reference_or_note_required`);
  const changed=await db.update(schema.payouts).set({status:op,reference,note,processedAt:new Date()}).where(and(eq(schema.payouts.id,id),eq(schema.payouts.status,"requested"))).returning({id:schema.payouts.id});
  if(!changed.length)return;
  await audit(user.id, `payout.${op}`, id);
  revalidatePath(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/finance`);
  revalidatePath(`/${locale}/dev`,"layout");
}

export async function settingsAction(form: FormData) {
  const { user, locale } = await admin(form);
  const n = (k: string, fallback: number, min: number, max: number) => {
    const v = Number(str(form, k).replace(",", "."));
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  };
  const d = defaultSettings;
  const patch: Partial<Settings> = {
    paymentFeeBps: Math.round(n("fee", 0, 0, 50) * 100),
    minPayoutCents: 100000,
    holdDays: 0,
    maxZipMb: Math.round(n("maxZip", d.maxZipMb, 1, 2048)),
  };
  await saveSettings(patch);
  await audit(user.id, "settings.update", "", patch);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/settings?saved=1`);
}
