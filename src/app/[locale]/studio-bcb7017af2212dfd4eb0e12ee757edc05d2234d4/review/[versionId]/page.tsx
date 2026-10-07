import {VirusTotalPanel} from "@/components/VirusTotalPanel";
import {scanAllowsApproval} from "@/lib/virustotal-result";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { pickText } from "@/lib/i18n/text";
import { db, schema } from "@/lib/db";
import { gameFilesBase, gameSandbox } from "@/lib/env";
import { bytes, date } from "@/lib/format";
import { versionTone } from "@/lib/tones";
import { StatusBadge } from "@/components/Kpi";
import { Cover } from "@/components/GameCard";
import { SubmitButton } from "@/components/ui";
import { Player } from "../../../g/[slug]/Player";
import { reviewAction } from "../../actions";
import { LegacyFlashPanel } from "@/components/LegacyFlashPanel";
import { legacyRightsBlockPublish } from "@/lib/legacy-flash";

export default async function ReviewDetail({ params, searchParams }: PageProps<"/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review/[versionId]">) {
  const { locale, t } = await resolveLocale(params);
  const { versionId } = await params;
  const sp = await searchParams;
  const row = (
    await db
      .select({ v: schema.gameVersions, game: schema.games, dev: schema.developerProfiles, email: schema.users.email })
      .from(schema.gameVersions)
      .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
      .innerJoin(schema.users, eq(schema.users.id, schema.games.developerId))
      .leftJoin(schema.developerProfiles, eq(schema.developerProfiles.userId, schema.games.developerId))
      .where(eq(schema.gameVersions.id, versionId))
  )[0];
  if (!row) notFound();
  const { v, game, dev, email } = row;
  const fileBase = `${gameFilesBase()}/${v.id}/`;

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review`} className="text-sm text-muted hover:text-paper">← {t.admin.reviewTitle}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">{game.title}</h1>
        <StatusBadge tone={versionTone[v.status]}>v{v.number} · {t.dev.versionStatus[v.status]}</StatusBadge>
      </div>
      <p className="text-sm text-muted">
        {t.admin.developer}: <b className="text-paper">{dev?.displayName ?? "—"}</b> ({email}) · {t.admin.submittedAt}: {date(v.createdAt, locale)} ·{" "}
        {t.game.license}: {game.license} · {game.category} {game.premiumOnly && `· ${t.common.premium}`}
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          {v.runtimeKind!=="browser"?<div className="card p-6"><h2 className="h2">{locale==="en"?"Project received":locale==="az"?"Layihə qəbul edildi":"Proje alındı"}</h2><p className="text-sm text-muted mt-3">{v.runtimeKind==="node-source"?(locale==="en"?"A separate Node.js runtime must be prepared before publishing.":locale==="az"?"Yayımdan əvvəl ayrıca Node.js işləmə mühiti hazırlanmalıdır.":"Yayından önce ayrı bir Node.js çalıştırma ortamı hazırlanmalı."):(locale==="en"?"Upload a version containing a built dist or build folder before publishing.":locale==="az"?"Yayım üçün hazır dist və ya build qovluğu olan versiya yükləyin.":"Yayın için hazır dist veya build klasörü bulunan bir sürüm yükleyin.")}</p></div>:<Player
            gameId={game.id}
            previewVersionId={v.id}
            sandbox={gameSandbox()}
            orientation={game.orientation}
              fullscreenEnabled={game.fullscreenSupported!==false}
            locked={false}
            locale={locale}
            cover={<Cover title={game.title} path={game.coverPath} category={game.category} />}
            labels={{ play: t.game.play, fullscreen: t.game.fullscreen, premiumTitle: "", premiumText: "", premiumCta: "", sandboxNote: t.game.sandboxNote, error: t.common.error }}
          />}
          <div className="card space-y-2 p-4 text-sm">
            <p><b>TR:</b> {pickText(game.tagline, "tr")}</p>
            {game.tagline.en && <p><b>EN:</b> {game.tagline.en}</p>}
            {game.tagline.az && <p><b>AZ:</b> {game.tagline.az}</p>}
            {pickText(game.description, "tr") && <p className="whitespace-pre-line text-muted">{pickText(game.description, "tr")}</p>}
            {v.changelog && <p className="text-muted"><b>{t.dev.fChangelog}</b> {v.changelog}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <VirusTotalPanel versionId={v.id} initial={v.report.virustotal} pending={v.status==="pending"} locale={locale}/>
          <LegacyFlashPanel locale={locale} version={v} game={game}/>
          {v.status === "pending" && (
            <form action={reviewAction} className="card space-y-3 p-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="versionId" value={v.id} />
              <label className="label">{locale==="en"?"Rejection reason":locale === "az" ? "Rədd edilmə səbəbi" : "Ret nedeni"}<select name="reason" className="input"><option value="manual">{locale==="en"?"Admin review":locale === "az" ? "Admin yoxlaması" : "Admin incelemesi"}</option><option value="virustotal">VirusTotal</option></select></label>
              <textarea name="note" rows={3} placeholder={t.admin.notePlaceholder} className="input" />
              {sp.error === "scan" && <p className="text-sm text-danger">{locale==="en"?"Approval requires a cover and a completed scan with no malicious or suspicious detections.":locale === "az" ? "Təsdiq üçün üz qabığı və zərərli/şübhəli nəticəsi olmayan tamamlanmış tarama lazımdır." : "Onay için kapak ve zararlı/şüpheli tespit içermeyen tamamlanmış tarama gerekiyor."}</p>}
              {!game.coverPath&&<p className="text-amber text-xs">{locale==="en"?"The developer must add a cover.":locale === "az" ? "Geliştirici oyunun üz qabığını əlavə etməlidir." : "Geliştirici oyun kapağını eklemeli."}</p>}
              {sp.error === "rights" && <p className="text-sm text-danger">Publishing requires verified redistribution rights.</p>}
              {sp.error === "note" && <p className="text-sm text-danger">{t.admin.noteRequired}</p>}
              <div className="flex gap-2">
                <span title={legacyRightsBlockPublish(v.report) ? "Publishing requires verified redistribution rights." : undefined} className="flex-1">
                  <SubmitButton name="decision" value="approve" disabled={v.runtimeKind!=="browser"||!game.coverPath||!scanAllowsApproval(v.report.virustotal)||legacyRightsBlockPublish(v.report)} className="btn btn-primary w-full">✓ {t.admin.approve}</SubmitButton>
                </span>
                <SubmitButton name="decision" value="reject" className="btn btn-danger">✕ {t.admin.reject}</SubmitButton>
              </div>
            </form>
          )}
          <div className="card space-y-3 p-4 text-sm">
            <h2 className="font-display font-bold">{t.dev.report}</h2><p className="text-xs text-muted">{locale==="en"?"Static scan for suspicious patterns and external hosts. Review the source before approving; this is not an antivirus verdict.":locale === "az" ? "Şübhəli kod və xarici ünvanlar üçün statik tarama hesabatı. Təsdiqdən əvvəl mənbəni yoxla; bu hesabat antivirus nəticəsi deyil." : "Şüpheli kod ve dış adresler için statik tarama raporu. Onaydan önce kaynakları incele; bu rapor antivirüs sonucu değildir."}</p>
            <p className="text-muted">{v.report.fileCount} {t.dev.files} · {bytes(v.report.totalBytes)} · entry: <code>{v.entry}</code></p>
            <div>
              <div className="font-semibold text-amber">⚠ {t.dev.warnings} ({v.report.warnings.length})</div>
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-muted">
                {v.report.warnings.length ? v.report.warnings.map((w) => <li key={w}>{w}</li>) : <li>{t.common.none}</li>}
              </ul>
            </div>
            <div>
              <div className="font-semibold">🌐 {t.dev.externalHosts} ({v.report.externalHosts.length})</div>
              <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto font-mono text-xs text-muted">
                {v.report.externalHosts.length ? v.report.externalHosts.map((h) => <li key={h}>{h}</li>) : <li>{t.common.none}</li>}
              </ul>
            </div>
            {!v.report.sourceRemovedAt && <a href={`/api/source/${v.id}`} className="btn btn-ghost btn-sm w-full">⬇ {t.admin.downloadZip}</a>}
          </div>
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-display font-bold">{t.admin.fileTree}</h2>
            <ul className="max-h-96 space-y-0.5 overflow-auto font-mono text-xs">
              {v.files.map((f) => (
                <li key={f.path} className="flex justify-between gap-2">
                  <a href={`/api/review/files/${v.id}?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer" className="truncate text-muted hover:text-mint">
                    {f.path}
                  </a>
                  <span className="shrink-0 text-faint">{bytes(f.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
