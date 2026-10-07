import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { bytes, date } from "@/lib/format";
import { StatusBadge } from "@/components/Kpi";

export default async function ReviewQueue({ params }: PageProps<"/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review">) {
  const { locale, t } = await resolveLocale(params);
  const rows = await db
    .select({ v: schema.gameVersions, game: schema.games, dev: schema.developerProfiles, email: schema.users.email })
    .from(schema.gameVersions)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
    .innerJoin(schema.users, eq(schema.users.id, schema.games.developerId))
    .leftJoin(schema.developerProfiles, eq(schema.developerProfiles.userId, schema.games.developerId))
    .where(eq(schema.gameVersions.status, "pending"))
    .orderBy(asc(schema.gameVersions.createdAt));
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.admin.reviewTitle}</h1>
      {rows.length === 0 ? (
        <div className="card p-10 text-center text-muted">{t.admin.reviewEmpty}</div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ v, game, dev, email }) => (
            <Link key={v.id} href={`/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/review/${v.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-mint/40">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">{game.title}</span>
                  <StatusBadge tone="amber">v{v.number}</StatusBadge>
                  <span className="text-xs text-muted">VirusTotal: {v.report.virustotal?.status??"pending"}{v.report.virustotal?.stats&&` · ${v.report.virustotal.stats.malicious??0} zararlı · ${v.report.virustotal.stats.suspicious??0} şüpheli`}</span>
                  {game.liveVersionId ? <StatusBadge tone="sky">{locale==="en"?"Update":locale==="az"?"Yeniləmə":"Güncelleme"}</StatusBadge> : <StatusBadge tone="mint">{locale==="en"?"New":locale==="az"?"Yeni":"Yeni"}</StatusBadge>}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {dev?.displayName ?? email} · {date(v.createdAt, locale)} · {v.report.fileCount} {t.dev.files} · {bytes(v.report.totalBytes)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {v.report.warnings.length > 0 && <StatusBadge tone="danger">⚠ {v.report.warnings.length}</StatusBadge>}
                {v.report.externalHosts.length > 0 && <StatusBadge tone="muted">🌐 {v.report.externalHosts.length}</StatusBadge>}
                <span className="text-mint">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
