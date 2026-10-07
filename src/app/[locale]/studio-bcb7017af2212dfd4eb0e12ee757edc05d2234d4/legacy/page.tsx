import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { bytes, date } from "@/lib/format";
import { StatusBadge } from "@/components/Kpi";
import { LegacyFlashPanel } from "@/components/LegacyFlashPanel";

export default async function LegacyImports({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string | string[] }> }) {
  const { locale } = await resolveLocale(params);
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const en = locale === "en";
  const rows = await db
    .select({ v: schema.gameVersions, game: schema.games })
    .from(schema.gameVersions)
    .innerJoin(schema.games, sql`${schema.games.id} = ${schema.gameVersions.gameId}`)
    .where(sql`${schema.gameVersions.report}->'legacyFlash' is not null`)
    .orderBy(desc(schema.gameVersions.createdAt));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">{en ? "Legacy imports" : locale === "az" ? "Köhnə Flash oyunları" : "Eski Flash oyunları"}</h1>
        <p className="mt-2 text-sm text-muted">{en ? "GitHub hosting is not redistribution permission. Pending rights stay out of the public catalogue." : "GitHub'da bulunmak dağıtım izni değildir. Hakları doğrulanmayan oyunlar herkese açık katalogda yer almaz."}</p>
      </div>
      {error && <p className="text-sm text-danger">{error === "note" ? (en ? "A rejection note is required." : "Ret için not gerekli.") : error}</p>}
      {rows.length === 0 ? (
        <div className="card p-10 text-center text-muted">{en ? "No legacy imports yet." : "Henüz eski Flash içe aktarması yok."}</div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ v, game }) => {
            const meta = v.report.legacyFlash!;
            return (
              <article key={v.id} className="card space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold">{game.title}</h2>
                  <StatusBadge tone="amber">{meta.rightsStatus}</StatusBadge>
                  <StatusBadge tone={meta.runtimeStatus === "broken" ? "danger" : meta.runtimeStatus === "ok" ? "mint" : "muted"}>{meta.runtimeStatus}</StatusBadge>
                  <Link className="text-sm text-mint" href={`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review/${v.id}`}>{en ? "Review" : "İnceleme"}</Link>
                </div>
                <dl className="grid gap-2 text-xs text-muted sm:grid-cols-2">
                  <div><dt>Source</dt><dd className="text-paper">{meta.sourceFile}</dd></div>
                  <div><dt>SWF size</dt><dd className="text-paper">{bytes(meta.swfBytes)}</dd></div>
                  <div><dt>SHA</dt><dd className="break-all font-mono text-paper">{meta.sourceSha}</dd></div>
                  <div><dt>Ruffle</dt><dd className="text-paper">{meta.ruffleVersion}</dd></div>
                  <div><dt>Scan</dt><dd className="text-paper">{v.report.virustotal?.status ?? "pending"} · {v.report.warnings.length}</dd></div>
                  <div><dt>Rights</dt><dd className="text-paper">{meta.rightsStatus}</dd></div>
                  <div><dt>Runtime</dt><dd className="text-paper">{meta.runtimeStatus}{meta.ruffleError ? ` · ${meta.ruffleError}` : ""}</dd></div>
                  <div><dt>{en ? "Imported" : "İçe aktarıldı"}</dt><dd className="text-paper">{date(v.createdAt, locale)}</dd></div>
                </dl>
                <LegacyFlashPanel locale={locale} version={v} game={game} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
