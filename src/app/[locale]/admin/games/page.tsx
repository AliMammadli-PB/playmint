import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { num } from "@/lib/format";
import { gameTone } from "@/lib/tones";
import { StatusBadge } from "@/components/Kpi";
import { gameAdminAction } from "../actions";

export default async function AdminGames({ params }: PageProps<"/[locale]/admin/games">) {
  const { locale, t } = await resolveLocale(params);
  const rows = await db
    .select({ game: schema.games, dev: schema.developerProfiles })
    .from(schema.games)
    .leftJoin(schema.developerProfiles, eq(schema.developerProfiles.userId, schema.games.developerId))
    .orderBy(desc(schema.games.createdAt))
    .limit(500);
  const Btn = ({ gameId, op, label, danger = false }: { gameId: string; op: string; label: string; danger?: boolean }) => (
    <form action={gameAdminAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="op" value={op} />
      <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-ghost"}`}>{label}</button>
    </form>
  );
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.admin.gamesTitle}</h1>
      <div className="card overflow-x-auto">
        <table className="table-pm">
          <thead>
            <tr>
              <th>{t.dev.colGame}</th>
              <th>{t.common.status}</th>
              <th className="text-right">{t.common.plays}</th>
              <th className="text-right">{t.common.likes}</th>
              <th>{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ game: g, dev }) => (
              <tr key={g.id}>
                <td>
                  <Link href={`/${locale}/dev/games/${g.id}`} className="font-semibold hover:text-mint">{g.title}</Link>
                  <div className="text-xs text-faint">{dev?.displayName ?? "—"} · /{g.slug}</div>
                </td>
                <td className="space-x-1 whitespace-nowrap">
                  <StatusBadge tone={gameTone[g.status]}>{t.dev.gameStatus[g.status]}</StatusBadge>
                  {g.featured && <StatusBadge tone="sky">★ featured</StatusBadge>}
                  {g.premiumOnly && <StatusBadge tone="amber">Premium</StatusBadge>}
                </td>
                <td className="text-right tabular-nums">{num(g.playCount, locale)}</td>
                <td className="text-right tabular-nums">{num(g.likeCount, locale)}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <Btn gameId={g.id} op={g.featured ? "unfeature" : "feature"} label={g.featured ? t.admin.unfeature : t.admin.feature} />
                    <Btn gameId={g.id} op={g.premiumOnly ? "free" : "premium"} label={g.premiumOnly ? t.admin.makeFree : t.admin.makePremium} />
                    {g.status === "published" ? (
                      <Btn gameId={g.id} op="unlist" label={t.admin.unlist} />
                    ) : (
                      g.liveVersionId && <Btn gameId={g.id} op="publish" label={t.admin.publish} />
                    )}
                    {g.status !== "removed" && <Btn gameId={g.id} op="remove" label={t.admin.remove} danger />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
