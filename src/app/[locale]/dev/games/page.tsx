import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { num } from "@/lib/format";
import { StatusBadge } from "@/components/Kpi";
import { Cover } from "@/components/GameCard";
import { gameTone, versionTone } from "@/lib/tones";


export default async function DevGames({ params }: PageProps<"/[locale]/dev/games">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireDeveloper(locale);
  const games = await db.select().from(schema.games).where(eq(schema.games.developerId, user.id)).orderBy(desc(schema.games.createdAt));
  const versions = await db
    .select({ gameId: schema.gameVersions.gameId, number: schema.gameVersions.number, status: schema.gameVersions.status })
    .from(schema.gameVersions)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
    .where(eq(schema.games.developerId, user.id))
    .orderBy(desc(schema.gameVersions.number));
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) if (!latest.has(v.gameId)) latest.set(v.gameId, v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">{t.dev.gamesTitle}</h1>
        <Link href={`/${locale}/dev/games/new`} className="btn btn-primary">+ {t.dev.nav.newGame}</Link>
      </div>
      {games.length === 0 ? (
        <div className="card p-10 text-center text-muted">{t.dev.noGames}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-pm">
            <thead>
              <tr>
                <th>{t.dev.colGame}</th>
                <th>{t.common.status}</th>
                <th>{t.dev.colLatest}</th>
                <th className="text-right">{t.common.plays}</th>
                <th className="text-right">{t.common.likes}</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const v = latest.get(g.id);
                return (
                  <tr key={g.id} className="hover:bg-surface-2/50">
                    <td>
                      <Link href={`/${locale}/dev/games/${g.id}`} className="flex items-center gap-3">
                        <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg">
                          <Cover title={g.title} path={g.coverPath} category={g.category} className="text-xl [&_span]:text-xl" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold hover:text-mint">{g.title}</div>
                          <div className="font-mono text-xs text-faint">/{g.slug}</div>
                        </div>
                      </Link>
                    </td>
                    <td><StatusBadge tone={gameTone[g.status]}>{t.dev.gameStatus[g.status]}</StatusBadge></td>
                    <td>{v && <StatusBadge tone={versionTone[v.status]}>v{v.number} · {t.dev.versionStatus[v.status]}</StatusBadge>}</td>
                    <td className="text-right tabular-nums">{num(g.playCount, locale)}</td>
                    <td className="text-right tabular-nums">{num(g.likeCount, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
