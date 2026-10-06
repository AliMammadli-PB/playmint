import { asc, desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { computePeriod, currentMonth, previousMonth } from "@/lib/finance";
import { date, hours, money, monthLabel } from "@/lib/format";
import { Kpi, StatusBadge } from "@/components/Kpi";
import { SubmitButton } from "@/components/ui";
import { payoutAction, periodAction } from "../actions";

export default async function Finance({ params, searchParams }: PageProps<"/[locale]/admin/finance">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const [periods, live, payouts] = await Promise.all([
    db.select().from(schema.revenuePeriods).orderBy(desc(schema.revenuePeriods.month)),
    computePeriod(currentMonth()),
    db
      .select({ p: schema.payouts, name: schema.developerProfiles.displayName, email: schema.users.email })
      .from(schema.payouts)
      .innerJoin(schema.users, eq(schema.users.id, schema.payouts.developerId))
      .leftJoin(schema.developerProfiles, eq(schema.developerProfiles.userId, schema.payouts.developerId))
      .where(eq(schema.payouts.status, "requested"))
      .orderBy(asc(schema.payouts.createdAt)),
  ]);
  const latest = periods[0];
  const top = latest
    ? await db
        .select({ e: schema.earnings, title: schema.games.title })
        .from(schema.earnings)
        .innerJoin(schema.games, eq(schema.games.id, schema.earnings.gameId))
        .where(eq(schema.earnings.month, latest.month))
        .orderBy(desc(schema.earnings.amountCents))
        .limit(10)
    : [];
  const m = (c: number, cur = live.currency) => money(c, cur, locale);
  const months: string[] = [];
  for (let mo = previousMonth(currentMonth()), i = 0; i < 12; i++, mo = previousMonth(mo)) months.push(mo);

  return (
    <div className="space-y-8">
      <h1 className="h1">{t.admin.financeTitle}</h1>
      {sp.error && <p className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{String(sp.error)}</p>}

      <section className="space-y-3">
        <h2 className="h2 text-lg capitalize">{t.admin.currentEstimate} · {monthLabel(currentMonth(), locale)}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t.admin.gross} value={m(live.grossCents)} />
          <Kpi label={t.admin.net} value={m(live.netCents)} />
          <Kpi label={t.admin.pool} value={m(live.distributedCents)} />
          <Kpi label={t.admin.platform} value={m(live.platformCents)} accent />
          <Kpi label={t.admin.subscribers} value={String(live.subscriberCount)} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="h2 text-lg">{t.admin.periods}</h2>
          <form action={periodAction} className="flex items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="op" value="compute" />
            <select name="month" className="input w-auto py-1.5 text-sm" aria-label={t.admin.closeMonth}>
              {months.map((mo) => (
                <option key={mo} value={mo}>{monthLabel(mo, locale)}</option>
              ))}
            </select>
            <SubmitButton className="btn btn-ghost btn-sm">{t.admin.compute}</SubmitButton>
          </form>
        </div>
        {periods.length === 0 ? (
          <div className="card p-8 text-center text-muted">{t.admin.noPeriods}</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-pm">
              <thead>
                <tr>
                  <th>{t.common.month}</th>
                  <th>{t.common.status}</th>
                  <th className="text-right">{t.admin.gross}</th>
                  <th className="text-right">{t.admin.pool}</th>
                  <th className="text-right">{t.admin.platform}</th>
                  <th className="text-right">{t.admin.subscribers}</th>
                  <th>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.month}>
                    <td className="capitalize">{monthLabel(p.month, locale)}</td>
                    <td><StatusBadge tone={p.status === "final" ? "mint" : "amber"}>{t.admin.periodStatus[p.status]}</StatusBadge></td>
                    <td className="text-right tabular-nums">{m(p.grossCents, p.currency)}</td>
                    <td className="text-right tabular-nums">{m(p.poolCents - 0, p.currency)}</td>
                    <td className="text-right tabular-nums">{m(p.platformCents, p.currency)}</td>
                    <td className="text-right tabular-nums">{p.subscriberCount}</td>
                    <td>
                      {p.status === "draft" && (
                        <div className="flex gap-1.5">
                          <form action={periodAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="month" value={p.month} />
                            <input type="hidden" name="op" value="compute" />
                            <SubmitButton className="btn btn-ghost btn-sm">{t.admin.recompute}</SubmitButton>
                          </form>
                          <form action={periodAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="month" value={p.month} />
                            <input type="hidden" name="op" value="finalize" />
                            <SubmitButton className="btn btn-primary btn-sm" confirm={t.admin.finalizeConfirm}>{t.admin.finalize}</SubmitButton>
                          </form>
                        </div>
                      )}
                      {p.finalizedAt && <span className="text-xs text-faint">{date(p.finalizedAt, locale)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {top.length > 0 && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold capitalize">{t.admin.topGames} · {monthLabel(latest.month, locale)}</h3>
            <ul className="space-y-1 text-sm">
              {top.map(({ e, title }) => (
                <li key={e.gameId} className="flex justify-between gap-3">
                  <span>{title} <span className="text-xs text-faint">· {hours(e.premiumSeconds, locale)} h · {e.payingPlayers}</span></span>
                  <span className="tabular-nums text-mint">{m(e.amountCents, latest.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="h2 text-lg">{t.admin.payoutQueue}</h2>
        {payouts.length === 0 ? (
          <div className="card p-8 text-center text-muted">{t.dev.noPayouts}</div>
        ) : (
          payouts.map(({ p, name, email }) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <div className="font-semibold">{name ?? email} · <span className="text-mint">{m(p.amountCents, p.currency)}</span></div>
                <div className="font-mono text-xs text-muted">{p.method.toUpperCase()} · {p.details}</div>
                <div className="text-xs text-faint">{date(p.createdAt, locale)}</div>
              </div>
              <form action={payoutAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="payoutId" value={p.id} />
                <input name="reference" placeholder={t.admin.reference} className="input w-44 py-1.5 text-xs" />
                <input name="note" placeholder="note" className="input w-32 py-1.5 text-xs" />
                <SubmitButton name="op" value="paid" className="btn btn-primary btn-sm">{t.admin.markPaid}</SubmitButton>
                <SubmitButton name="op" value="rejected" className="btn btn-danger btn-sm">{t.admin.rejectPayout}</SubmitButton>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
