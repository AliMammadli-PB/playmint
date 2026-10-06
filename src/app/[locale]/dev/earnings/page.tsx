import { desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { developerBalance } from "@/lib/finance";
import { date, hours, money, monthLabel } from "@/lib/format";
import { payoutTone } from "@/lib/tones";
import { Kpi, StatusBadge } from "@/components/Kpi";
import { FormSuccess, SubmitButton } from "@/components/ui";
import { requestPayoutAction } from "../actions";
import Link from "next/link";

export default async function Earnings({ params, searchParams }: PageProps<"/[locale]/dev/earnings">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireDeveloper(locale);
  const sp = await searchParams;
  const [balance, rows, payouts, profile] = await Promise.all([
    developerBalance(user.id),
    db
      .select({
        month: schema.earnings.month,
        amount: schema.earnings.amountCents,
        seconds: schema.earnings.premiumSeconds,
        players: schema.earnings.payingPlayers,
        title: schema.games.title,
        status: schema.revenuePeriods.status,
        currency: schema.revenuePeriods.currency,
      })
      .from(schema.earnings)
      .innerJoin(schema.games, eq(schema.games.id, schema.earnings.gameId))
      .innerJoin(schema.revenuePeriods, eq(schema.revenuePeriods.month, schema.earnings.month))
      .where(eq(schema.earnings.developerId, user.id))
      .orderBy(desc(schema.earnings.month), desc(schema.earnings.amountCents)),
    db.select().from(schema.payouts).where(eq(schema.payouts.developerId, user.id)).orderBy(desc(schema.payouts.createdAt)),
    db.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.userId, user.id)),
  ]);
  const finals = rows.filter((r) => r.status === "final");
  const m = (c: number) => money(c, balance.currency, locale);
  const hasMethod = !!profile[0]?.payoutMethod && !!profile[0]?.payoutDetails;
  const canRequest = hasMethod && balance.availableCents >= balance.minPayoutCents;

  return (
    <div className="space-y-8">
      <h1 className="h1">{t.dev.earningsTitle}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t.dev.lifetime} value={m(balance.lifetimeCents)} />
        <Kpi label={t.dev.pending} value={m(balance.pendingCents)} />
        <Kpi label={t.dev.available} value={m(balance.availableCents)} accent />
        <Kpi label={t.dev.paid} value={m(balance.paidCents)} hint={balance.requestedCents ? `${t.dev.requested}: ${m(balance.requestedCents)}` : undefined} />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="text-sm text-muted">
          {sp.requested ? (
            <FormSuccess message={t.dev.payoutRequested} />
          ) : !hasMethod ? (
            <Link href={`/${locale}/dev/settings`} className="text-amber hover:underline">{t.dev.payoutNeedsMethod}</Link>
          ) : (
            fill(t.dev.payoutMin, { min: m(balance.minPayoutCents) })
          )}
        </div>
        <form action={requestPayoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <SubmitButton disabled={!canRequest}>{fill(t.dev.requestPayout, { amount: m(balance.availableCents) })}</SubmitButton>
        </form>
      </div>

      <section>
        <h2 className="h2 mb-3 text-lg">{t.dev.monthly}</h2>
        {finals.length ? (
          <div className="card overflow-x-auto">
            <table className="table-pm">
              <thead>
                <tr>
                  <th>{t.common.month}</th>
                  <th>{t.dev.colGame}</th>
                  <th className="text-right">{t.dev.kpiPremiumHours}</th>
                  <th className="text-right">{t.dev.payingPlayers}</th>
                  <th className="text-right">{t.common.amount}</th>
                </tr>
              </thead>
              <tbody>
                {finals.map((r) => (
                  <tr key={`${r.month}-${r.title}`}>
                    <td className="capitalize">{monthLabel(r.month, locale)}</td>
                    <td>{r.title}</td>
                    <td className="text-right tabular-nums">{hours(r.seconds, locale)}</td>
                    <td className="text-right tabular-nums">{r.players}</td>
                    <td className="text-right font-semibold tabular-nums text-mint">{money(r.amount, r.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center text-muted">{t.dev.noEarnings}</div>
        )}
      </section>

      <section>
        <h2 className="h2 mb-3 text-lg">{t.dev.payoutsTitle}</h2>
        {payouts.length ? (
          <div className="card overflow-x-auto">
            <table className="table-pm">
              <thead>
                <tr>
                  <th>{t.common.date}</th>
                  <th>{t.dev.payoutMethod}</th>
                  <th>{t.common.status}</th>
                  <th className="text-right">{t.common.amount}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{date(p.createdAt, locale)}</td>
                    <td className="text-muted">{p.method.toUpperCase()}</td>
                    <td>
                      <StatusBadge tone={payoutTone[p.status]}>{t.dev.payoutStatus[p.status]}</StatusBadge>
                      {p.note && <div className="mt-1 text-xs text-muted">{p.note}</div>}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{money(p.amountCents, p.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center text-muted">{t.dev.noPayouts}</div>
        )}
      </section>
    </div>
  );
}
