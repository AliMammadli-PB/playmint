import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { requireUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/premium";
import { db, schema } from "@/lib/db";
import { cardFields } from "@/lib/games";
import { date } from "@/lib/format";
import { GameGrid } from "@/components/GameCard";

export default async function MePage({ params }: PageProps<"/[locale]/me">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireUser(locale);
  const g = schema.games;
  const d = schema.developerProfiles;
  const [sub, liked, recent] = await Promise.all([
    getActiveSubscription(user.id),
    db
      .select(cardFields)
      .from(schema.likes)
      .innerJoin(g, eq(g.id, schema.likes.gameId))
      .leftJoin(d, eq(d.userId, g.developerId))
      .where(eq(schema.likes.userId, user.id))
      .orderBy(desc(schema.likes.createdAt))
      .limit(24),
    db
      .select({ ...cardFields, last: sql<string>`max(${schema.userGameDaily.day})` })
      .from(schema.userGameDaily)
      .innerJoin(g, eq(g.id, schema.userGameDaily.gameId))
      .leftJoin(d, eq(d.userId, g.developerId))
      .where(eq(schema.userGameDaily.userId, user.id))
      .groupBy(g.id, d.userId)
      .orderBy(desc(sql`max(${schema.userGameDaily.day})`))
      .limit(12),
  ]);

  return (
    <div className="container-pm py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="h1">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="card px-4 py-3 text-sm">
          <span className="text-muted">{t.me.premiumStatus}: </span>
          {sub ? (
            <span className="font-semibold text-amber">★ {fill(t.premium.activeUntil, { date: date(sub.currentPeriodEnd, locale) })}</span>
          ) : (
            <Link href={`/${locale}/premium`} className="font-semibold text-mint hover:underline">
              {t.me.notPremium} → {t.premium.subscribe}
            </Link>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="h2 mb-4">{t.me.recent}</h2>
        {recent.length ? <GameGrid games={recent} locale={locale} t={t} /> : <p className="text-muted">{t.me.emptyRecent}</p>}
      </section>
      <section className="mt-10">
        <h2 className="h2 mb-4">{t.me.liked}</h2>
        {liked.length ? <GameGrid games={liked} locale={locale} t={t} /> : <p className="text-muted">{t.me.emptyLiked}</p>}
      </section>
      {user.role === "player" && (
        <Link href={`/${locale}/developers`} className="card mt-12 block p-6 hover:border-mint/40">
          <span className="font-display text-lg font-bold">🛠️ {t.me.becomeDev} →</span>
        </Link>
      )}
    </div>
  );
}
