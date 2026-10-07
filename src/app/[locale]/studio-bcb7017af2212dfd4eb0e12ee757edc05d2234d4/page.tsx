import { sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db } from "@/lib/db";

import { dailyStats, sumStats } from "@/lib/stats";
import { hours, money, num } from "@/lib/format";
import { Kpi } from "@/components/Kpi";
import { StatsChart } from "@/components/StatsChart";

export default async function AdminOverview({ params }: PageProps<"/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4">) {
  const { locale, t } = await resolveLocale(params);
  const counts = (
    await db.execute<Record<string, string>>(sql`
      select
        (select count(*) from users) as users,
        (select count(*) from users where role in ('developer','admin')) as devs,
        (select count(*) from games where status = 'published' and live_version_id is not null) as games,
        (select count(*) from game_versions where status = 'pending') as pending,
        (select count(distinct user_id) from subscriptions where status = 'active' and current_period_end > now()) as premium,
        (select count(*) from payouts where status = 'requested') as payouts,
        (select array_agg(id) from games) as ids
    `)
  ).rows[0];
  const ids = (counts.ids as unknown as string[] | null) ?? [];
  const [financial,days]=await Promise.all([db.execute<Record<string,string>>(sql`
    select (select coalesce(sum(net_try_cents),0) from ad_settlements where status='confirmed' and confirmed_at>=date_trunc('month',now())) as net,
    (select coalesce(sum(a.platform_cents),0) from ad_allocations a join ad_settlements p on p.id=a.settlement_id where p.status='confirmed' and p.confirmed_at>=date_trunc('month',now())) as platform
  `),dailyStats(ids,30)]);
  const estimate={currency:"TRY",grossCents:Number(financial.rows[0].net),platformCents:Number(financial.rows[0].platform)};
  const sum = sumStats(days);
  const m = (c: number) => money(c, estimate.currency, locale);
  return (
    <div className="space-y-6">
      <h1 className="h1">{t.admin.overviewTitle}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t.admin.kpiUsers} value={num(Number(counts.users), locale)} />
        <Kpi label={t.admin.kpiDevs} value={num(Number(counts.devs), locale)} />
        <Kpi label={t.admin.kpiGames} value={num(Number(counts.games), locale)} />
        <Kpi label={t.admin.kpiPending} value={num(Number(counts.pending), locale)} accent={Number(counts.pending) > 0} />
        <Kpi label={t.admin.kpiPremium} value={num(Number(counts.premium), locale)} />
        <Kpi label={locale==="en"?"Confirmed income this month":locale === "az" ? "Bu ay təsdiqlənmiş bank gəliri" : "Bu ay onaylı banka geliri"} value={m(estimate.grossCents)} />
        <Kpi label={t.admin.kpiPlatformMonth} value={m(estimate.platformCents)} accent />
        <Kpi label={t.admin.kpiPayouts} value={num(Number(counts.payouts), locale)} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t.dev.kpiPlays} value={num(sum.plays, locale)} hint={t.dev.last30} />
        <Kpi label={t.dev.kpiUnique} value={num(sum.unique, locale)} hint={t.dev.last30} />
        <Kpi label={t.dev.kpiHours} value={hours(sum.seconds, locale)} hint={t.dev.last30} />
        <Kpi label={t.dev.kpiPremiumHours} value={hours(sum.premiumSeconds, locale)} hint={t.dev.last30} />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-display font-bold">{t.dev.chartTitle}</h2>
        <StatsChart
          data={days.map((d) => ({ day: d.day, plays: d.plays, minutes: Math.round(d.seconds / 60), premiumMinutes: Math.round(d.premiumSeconds / 60) }))}
          labels={{ plays: t.dev.seriesPlays, minutes: t.dev.seriesMinutes, premium: t.dev.seriesPremium }}
        />
      </div>
    </div>
  );
}
