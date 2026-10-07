import {UploadPolicy} from "@/components/UploadPolicy";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { dailyStats, sumStats } from "@/lib/stats";
import { getSettings } from "@/lib/settings";
import { metaFieldProps, uploadLabels } from "@/lib/i18n/forms";
import { bytes, date, hours, num } from "@/lib/format";
import { gameTone, versionTone } from "@/lib/tones";
import { Kpi, StatusBadge } from "@/components/Kpi";
import { StatsChart } from "@/components/StatsChart";
import { UploadForm } from "@/components/UploadForm";
import { ZipFields } from "../ZipFields";
import { EditGameForm } from "./EditGameForm";

export default async function DevGame({ params }: PageProps<"/[locale]/dev/games/[id]">) {
  const { locale, t } = await resolveLocale(params);
  const { id } = await params;
  const user = await requireDeveloper(locale);
  const owner = user.role === "admin" ? undefined : eq(schema.games.developerId, user.id);
  const game = (await db.select().from(schema.games).where(and(eq(schema.games.id, id), owner)))[0];
  if (!game) notFound();
  const [versions, days, s] = await Promise.all([
    db.select().from(schema.gameVersions).where(eq(schema.gameVersions.gameId, id)).orderBy(desc(schema.gameVersions.number)),
    dailyStats([id], 30),
    getSettings(),
  ]);
  const sum = sumStats(days);
  const pending = versions.find((v) => v.status === "pending");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/${locale}/dev/games`} className="text-sm text-muted hover:text-paper">← {t.dev.gamesTitle}</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="h1">{game.title}</h1>
            <StatusBadge tone={gameTone[game.status]}>{t.dev.gameStatus[game.status]}</StatusBadge>
            {game.premiumOnly && <StatusBadge tone="amber">{t.common.premium}</StatusBadge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="#edit" className="btn btn-primary btn-sm">{locale==="en"?"Edit game":locale==="az"?"Oyunu düzəlt":"Oyunu düzenle"}</Link>
          <Link href="#update" className="btn btn-ghost btn-sm">{t.dev.newVersion}</Link>
          <Link href={`/${locale}/dev/games/new`} className="btn btn-ghost btn-sm">{t.dev.nav.newGame}</Link>
          {game.liveVersionId && (
            <Link href={`/${locale}/g/${game.slug}`} className="btn btn-ghost btn-sm">{t.dev.viewPublic} ↗</Link>
          )}
          {pending && (
            <Link href={`/${locale}/g/${game.slug}?preview=${pending.id}`} className="btn btn-ghost btn-sm">{t.dev.preview} v{pending.number}</Link>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="h2 text-lg">{t.dev.statsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t.dev.kpiPlays} value={num(sum.plays, locale)} />
          <Kpi label={t.dev.kpiUnique} value={num(sum.unique, locale)} />
          <Kpi label={t.dev.kpiHours} value={hours(sum.seconds, locale)} />
          <Kpi label={t.dev.kpiPremiumHours} value={hours(sum.premiumSeconds, locale)} />
          <Kpi label={t.dev.kpiLikes} value={num(game.likeCount, locale)} />
        </div>
        <div className="card p-5">
          <StatsChart
            data={days.map((d) => ({ day: d.day, plays: d.plays, minutes: Math.round(d.seconds / 60), premiumMinutes: Math.round(d.premiumSeconds / 60) }))}
            labels={{ plays: t.dev.seriesPlays, minutes: t.dev.seriesMinutes, premium: t.dev.seriesPremium }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="h2 text-lg">{t.dev.versionsTitle}</h2>
        <div className="space-y-3">
          {versions.map((v) => (
            <div key={v.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-lg font-bold">v{v.number}</span>
                  <StatusBadge tone={versionTone[v.status]}>{t.dev.versionStatus[v.status]}</StatusBadge>
                  {v.id === game.liveVersionId && <StatusBadge tone="mint">● live</StatusBadge>}
                  <span className="text-xs text-faint">
                    {date(v.createdAt, locale)} · {v.report.fileCount} {t.dev.files} · {bytes(v.report.totalBytes)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/${locale}/g/${game.slug}?preview=${v.id}`} className="btn btn-ghost btn-sm">{t.dev.preview}</Link>
                  {!v.report.sourceRemovedAt && <a href={`/api/source/${v.id}`} className="btn btn-ghost btn-sm">⬇ zip</a>}
                </div>
              </div>
              {v.runtimeKind!=="browser"&&<p className="mt-3 rounded-xl bg-amber/10 p-3 text-sm text-amber">{locale==="en"?"Source project received. Build/runtime preparation is required before publishing.":locale==="az"?"Mənbə layihə qəbul edildi. Yayım üçün build/işləmə mühiti hazırlanmalıdır.":"Kaynak proje alındı. Yayın için build/çalıştırma hazırlığı gerekiyor."}</p>}
              {v.changelog && <p className="mt-2 whitespace-pre-line text-sm text-muted">{v.changelog}</p>}
              {v.reviewNote && (
                <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${v.status === "rejected" ? "bg-danger/10 text-danger" : "bg-surface-2 text-muted"}`}>
                  <b>{t.dev.reviewNote}:</b> {v.reviewNote}
                </p>
              )}
              {(v.report.warnings.length > 0 || v.report.externalHosts.length > 0) && (
                <details className="mt-3 text-xs text-muted">
                  <summary className="cursor-pointer">{t.dev.report}</summary>
                  {v.report.warnings.length > 0 && (
                    <p className="mt-2"><b className="text-amber">{t.dev.warnings}:</b> {v.report.warnings.join(", ")}</p>
                  )}
                  {v.report.externalHosts.length > 0 && (
                    <p className="mt-1"><b>{t.dev.externalHosts}:</b> {v.report.externalHosts.join(", ")}</p>
                  )}
                </details>
              )}
            </div>
          ))}
        </div>
        <div id="update" className="card scroll-mt-24 p-5">
          <h3 className="mb-4 font-display font-bold">{t.dev.newVersion}</h3>
          {pending && <p className="mb-4 text-sm text-amber">{t.dev.pendingExists}</p>}
          <UploadForm
            endpoint={`/api/dev/games/${game.id}/versions`}
            redirectTo={`/${locale}/dev/games/${game.id}`}
            submitLabel={t.dev.submitVersion}
            labels={uploadLabels(t)}
          >
            <input type="hidden" name="locale" value={locale} />
            <ZipFields
              requireOpenSource={game.license!=="Developer"}
              showChangelog
              maxMb={s.maxZipMb}
              labels={{ zip: fill(t.dev.fZip, { mb: s.maxZipMb }), zipHint: t.dev.fZipHint, changelog: t.dev.fChangelog, openSource: t.dev.fOpenSource }}
            />
            <UploadPolicy locale={locale}/>
          </UploadForm>
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="edit" className="h2 scroll-mt-24 text-lg">{t.dev.editTitle}</h2>
        <div className="card p-5">
          <EditGameForm
            gameId={game.id}
            locale={locale}
            fields={metaFieldProps(t)}
            saveLabel={t.common.save}
            savedLabel={t.common.saved}
            defaults={{
              title: game.title,
              slug: game.slug,
              category: game.category,
              tagline: game.tagline,
              description: game.description,
              tags: game.tags,
              license: game.license,
              orientation: game.orientation,
              mobileResponsive:game.mobileResponsive,
              fullscreenSupported:game.fullscreenSupported,
              premiumOnly: game.premiumOnly,
              subscriptionPriceCents: game.subscriptionPriceCents,
              subscriptionCurrency: game.subscriptionCurrency,
              subscriptionBenefits: game.subscriptionBenefits,
              rewardedAds: game.rewardedAds,
            }}
          />
        </div>
      </section>
    </div>
  );
}
