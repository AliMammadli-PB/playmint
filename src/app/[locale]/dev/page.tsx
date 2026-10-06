import Link from "next/link";
import { eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { dailyStats, sumStats } from "@/lib/stats";
import { computePeriod, currentMonth, developerBalance } from "@/lib/finance";
import { hours, money, num } from "@/lib/format";
import { Kpi } from "@/components/Kpi";
import { StatsChart } from "@/components/StatsChart";

export default async function DevOverview({ params }: PageProps<"/[locale]/dev">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireDeveloper(locale);
  const games = await db.select({ id: schema.games.id }).from(schema.games).where(eq(schema.games.developerId, user.id));
  const ids = games.map((g) => g.id);
  const [days, balance, estimate] = await Promise.all([dailyStats(ids, 30), developerBalance(user.id), computePeriod(currentMonth())]);
  const sum = sumStats(days);
  const idSet = new Set(ids);
  const est = estimate.games.filter((g) => idSet.has(g.gameId)).reduce((a, g) => a + g.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{fill(t.dev.overviewTitle, { name: user.name })}</h1>
        <Link href={`/${locale}/dev/games/new`} className="btn btn-primary">+ {t.dev.nav.newGame}</Link>
      </div>
      {ids.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl">🚀</div>
          <p className="mt-4 text-muted">{t.dev.noGames}</p>
          <Link href={`/${locale}/dev/games/new`} className="btn btn-primary mt-5">{t.dev.uploadFirst}</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={t.dev.kpiPlays} value={num(sum.plays, locale)} hint={t.dev.last30} />
            <Kpi label={t.dev.kpiUnique} value={num(sum.unique, locale)} hint={t.dev.last30} />
            <Kpi label={t.dev.kpiHours} value={hours(sum.seconds, locale)} hint={t.dev.last30} />
            <Kpi label={t.dev.kpiPremiumHours} value={hours(sum.premiumSeconds, locale)} hint={t.dev.last30} />
            <Kpi label={t.dev.kpiEstimate} value={money(est, estimate.currency, locale)} hint={t.dev.estimateHint} accent />
            <Kpi label={t.dev.kpiAvailable} value={money(balance.availableCents, balance.currency, locale)} accent />
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-display font-bold">{t.dev.chartTitle}</h2>
            <StatsChart
              data={days.map((d) => ({ day: d.day, plays: d.plays, minutes: Math.round(d.seconds / 60), premiumMinutes: Math.round(d.premiumSeconds / 60) }))}
              labels={{ plays: t.dev.seriesPlays, minutes: t.dev.seriesMinutes, premium: t.dev.seriesPremium }}
            />
          </div>
        </>
      )}
    </div>
  );
}
