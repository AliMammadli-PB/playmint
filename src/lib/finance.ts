import "server-only";
import { and, eq, gte, lt, sql, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { splitRevenue, type RevenueResult } from "@/lib/revenue";

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return { start, end, startDay: day(start), endDay: day(end) };
}

export function currentMonth(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

export type PeriodComputation = RevenueResult & {
  month: string;
  grossCents: number;
  subscriberCount: number;
  devShareBps: number;
  currency: string;
  developerOf: Record<string, string>;
};

/** Run the revenue split for a month from live data (does not persist). */
export async function computePeriod(month: string): Promise<PeriodComputation> {
  const s = await getSettings();
  const { start, end, startDay, endDay } = monthBounds(month);

  const pays = await db
    .select({ userId: schema.payments.userId, amount: schema.payments.amountCents, fee: schema.payments.feeCents })
    .from(schema.payments)
    .where(and(gte(schema.payments.paidAt, start), lt(schema.payments.paidAt, end), eq(schema.payments.currency, s.currency)));
  let grossCents = 0;
  const subscribers = pays.map((p) => {
    grossCents += p.amount;
    const fee = p.fee > 0 ? p.fee : Math.round((p.amount * s.paymentFeeBps) / 10000);
    return { userId: p.userId, netCents: p.amount - fee };
  });
  const subscriberIds = [...new Set(subscribers.map((x) => x.userId))];

  const plays = subscriberIds.length
    ? await db
        .select({
          userId: schema.userGameDaily.userId,
          gameId: schema.userGameDaily.gameId,
          day: schema.userGameDaily.day,
          seconds: schema.userGameDaily.premiumSeconds,
        })
        .from(schema.userGameDaily)
        .innerJoin(schema.games, eq(schema.games.id, schema.userGameDaily.gameId))
        .where(
          and(
            inArray(schema.userGameDaily.userId, subscriberIds),
            gte(schema.userGameDaily.day, startDay),
            lt(schema.userGameDaily.day, endDay),
            // Developers playing their own games do not earn from themselves.
            ne(schema.games.developerId, schema.userGameDaily.userId),
          ),
        )
    : [];

  const gameIds = [...new Set(plays.map((p) => p.gameId))];
  const likeRatio: Record<string, number> = {};
  const developerOf: Record<string, string> = {};
  if (gameIds.length) {
    // Like ratio = qualified likes / players who played at least likeMinSeconds (all time).
    const idList = sql.join(gameIds.map((g) => sql`${g}`), sql`, `);
    const rows = await db.execute<{ game_id: string; developer_id: string; players: string; liked: string }>(sql`
      with q as (
        select user_id, game_id, sum(seconds) as secs
        from user_game_daily where game_id in (${idList})
        group by user_id, game_id
        having sum(seconds) >= ${s.likeMinSeconds}
      )
      select g.id as game_id, g.developer_id,
        (select count(*) from q where q.game_id = g.id) as players,
        (select count(*) from q join likes l on l.user_id = q.user_id and l.game_id = q.game_id where q.game_id = g.id) as liked
      from games g where g.id in (${idList})
    `);
    for (const r of rows.rows) {
      const players = Number(r.players);
      likeRatio[r.game_id] = players > 0 ? Number(r.liked) / players : 0;
      developerOf[r.game_id] = r.developer_id;
    }
  }

  const result = splitRevenue({
    subscribers,
    plays,
    likeRatio,
    devShareBps: s.devShareBps,
    dailyCapSeconds: s.dailyCapSeconds,
    likeBonus: s.likeBonus,
  });
  return {
    ...result,
    month,
    grossCents,
    subscriberCount: subscriberIds.length,
    devShareBps: s.devShareBps,
    currency: s.currency,
    developerOf,
  };
}

/** Persist a draft (or re-draft) for a closed month. Final periods are immutable. */
export async function saveDraftPeriod(month: string) {
  if (month >= currentMonth()) throw new Error("period_not_closed");
  const existing = await db.select().from(schema.revenuePeriods).where(eq(schema.revenuePeriods.month, month));
  if (existing[0]?.status === "final") throw new Error("period_final");
  const c = await computePeriod(month);
  await db.transaction(async (tx) => {
    const values = {
      month,
      status: "draft" as const,
      grossCents: c.grossCents,
      netCents: c.netCents,
      devShareBps: c.devShareBps,
      poolCents: c.poolCents,
      platformCents: c.platformCents,
      subscriberCount: c.subscriberCount,
      currency: c.currency,
    };
    await tx
      .insert(schema.revenuePeriods)
      .values(values)
      .onConflictDoUpdate({ target: schema.revenuePeriods.month, set: values });
    await tx.delete(schema.earnings).where(eq(schema.earnings.month, month));
    const rows = c.games
      .filter((g) => g.amountCents > 0 && c.developerOf[g.gameId])
      .map((g) => ({
        month,
        gameId: g.gameId,
        developerId: c.developerOf[g.gameId],
        amountCents: g.amountCents,
        premiumSeconds: g.premiumSeconds,
        payingPlayers: g.payingPlayers,
      }));
    if (rows.length) await tx.insert(schema.earnings).values(rows);
  });
  return c;
}

export async function finalizePeriod(month: string) {
  await db
    .update(schema.revenuePeriods)
    .set({ status: "final", finalizedAt: new Date() })
    .where(and(eq(schema.revenuePeriods.month, month), eq(schema.revenuePeriods.status, "draft")));
}

export type DeveloperBalance = {
  currency: string;
  lifetimeCents: number;
  pendingCents: number; // finalized but still in hold period
  availableCents: number; // can be requested
  requestedCents: number;
  paidCents: number;
  minPayoutCents: number;
};

export async function developerBalance(developerId: string): Promise<DeveloperBalance> {
  const s = await getSettings();
  const holdMs = s.holdDays * 86400_000;
  const rows = await db
    .select({ amount: schema.earnings.amountCents, finalizedAt: schema.revenuePeriods.finalizedAt })
    .from(schema.earnings)
    .innerJoin(schema.revenuePeriods, eq(schema.revenuePeriods.month, schema.earnings.month))
    .where(and(eq(schema.earnings.developerId, developerId), eq(schema.revenuePeriods.status, "final")));
  let lifetime = 0;
  let released = 0;
  for (const r of rows) {
    lifetime += r.amount;
    if (r.finalizedAt && r.finalizedAt.getTime() + holdMs <= Date.now()) released += r.amount;
  }
  const outs = await db
    .select({ status: schema.payouts.status, amount: schema.payouts.amountCents })
    .from(schema.payouts)
    .where(eq(schema.payouts.developerId, developerId));
  let requested = 0;
  let paid = 0;
  for (const o of outs) {
    if (o.status === "requested") requested += o.amount;
    if (o.status === "paid") paid += o.amount;
  }
  return {
    currency: s.currency,
    lifetimeCents: lifetime,
    pendingCents: lifetime - released,
    availableCents: Math.max(0, released - requested - paid),
    requestedCents: requested,
    paidCents: paid,
    minPayoutCents: s.minPayoutCents,
  };
}
