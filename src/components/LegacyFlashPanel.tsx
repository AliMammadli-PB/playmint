import { bytes, date } from "@/lib/format";
import { legacyRightsBlockPublish } from "@/lib/legacy-flash";
import type { Game, GameVersion } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { SubmitButton } from "@/components/ui";
import { legacyAction } from "@/app/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/actions";

export function LegacyFlashPanel({ locale, version, game }: { locale: Locale; version: GameVersion; game: Game }) {
  const meta = version.report.legacyFlash;
  if (!meta) return null;
  const en = locale === "en";
  const az = locale === "az";
  const blocked = legacyRightsBlockPublish(version.report);
  return (
    <div className="card space-y-3 p-4 text-sm">
      <h2 className="font-display font-bold">Legacy Flash</h2>
      <p className="text-muted">{meta.sourceFile} · {bytes(meta.swfBytes)} · {date(version.createdAt, locale)}</p>
      <p className="break-all font-mono text-xs text-muted">{meta.sourceSha}</p>
      <p>Ruffle {meta.ruffleVersion} · {meta.runtimeStatus}{meta.ruffleError ? ` · ${meta.ruffleError}` : ""}</p>
      <p>{en ? "Rights" : az ? "Hüquqlar" : "Haklar"}: {meta.rightsStatus} · {en ? "Technical" : az ? "Texniki" : "Teknik"}: {meta.technicalStatus}</p>
      <p className="text-xs text-muted">{meta.sourceRepository}</p>
      <form action={legacyAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="versionId" value={version.id} />
        <a className="btn btn-ghost btn-sm" href={`/${locale}/g/${game.slug}?preview=${version.id}`}>{en ? "Preview" : az ? "Önizləmə" : "Önizleme"}</a>
        <SubmitButton name="op" value="technical" className="btn btn-ghost btn-sm" disabled={meta.technicalStatus === "approved"}>{en ? "Approve technical review" : az ? "Texniki yoxlamanı təsdiqlə" : "Teknik incelemeyi onayla"}</SubmitButton>
        <SubmitButton name="op" value="rights" className="btn btn-ghost btn-sm" disabled={meta.rightsStatus === "verified"}>{en ? "Mark rights verified" : az ? "Hüquqları təsdiqlə" : "Hakları doğrulandı işaretle"}</SubmitButton>
        <span title={en ? "Publication requires rights verification or recorded operator authorization." : az ? "Yayım üçün hüquq yoxlaması və ya qeydə alınmış operator təsdiqi lazımdır." : "Yayın için hak doğrulaması veya kaydedilmiş operatör onayı gerekir."}>
          <SubmitButton name="op" value="publish" className="btn btn-primary btn-sm" disabled={blocked || version.status !== "pending"}>{en ? "Publish" : az ? "Yayımla" : "Yayınla"}</SubmitButton>
        </span>
        <input name="note" className="input min-w-40 flex-1" placeholder={en ? "Rejection note" : az ? "Rədd qeydi" : "Ret notu"} />
        <SubmitButton name="op" value="reject" className="btn btn-danger btn-sm">{en ? "Reject" : az ? "Rədd et" : "Reddet"}</SubmitButton>
        <SubmitButton name="op" value="delete" className="btn btn-ghost btn-sm" confirm={en ? "Delete this unpublished legacy import?" : "Bu yayımlanmamış içe aktarmayı sil?"}>{en ? "Delete" : az ? "Sil" : "Sil"}</SubmitButton>
      </form>
      {blocked && <p className="text-xs text-amber">{en ? "Publication requires rights verification or recorded operator authorization." : az ? "Yayım üçün hüquq yoxlaması və ya qeydə alınmış operator təsdiqi lazımdır." : "Yayın için hak doğrulaması veya kaydedilmiş operatör onayı gerekir."}</p>}
    </div>
  );
}
