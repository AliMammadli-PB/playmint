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
  const {start,end}=monthBounds(month);
  const paid=await db.select({gameId:schema.subscriptions.gameId,userId:schema.payments.userId,amount:schema.payments.amountCents,fee:schema.payments.feeCents,developerId:schema.games.developerId})
   .from(schema.payments).innerJoin(schema.subscriptions,eq(schema.subscriptions.id,schema.payments.subscriptionId)).innerJoin(schema.games,eq(schema.games.id,schema.subscriptions.gameId))
   .where(and(gte(schema.payments.paidAt,start),lt(schema.payments.paidAt,end),eq(schema.payments.currency,s.currency),eq(schema.payments.test,false)));
  const ads=await db.select({gameId:schema.adEvents.gameId,amount:schema.adEvents.netCents,share:schema.adEvents.developerCents,developerId:schema.games.developerId}).from(schema.adEvents).innerJoin(schema.games,eq(schema.games.id,schema.adEvents.gameId))
   .where(and(eq(schema.adEvents.status,"verified"),gte(schema.adEvents.verifiedAt,start),lt(schema.adEvents.verifiedAt,end),eq(schema.adEvents.currency,s.currency)));
  const allocations=new Map<string,{gameId:string;amountCents:number;premiumSeconds:number;payingPlayers:number}>();
  const developerOf:Record<string,string>={};const players=new Map<string,Set<string>>();
  let grossCents=0,netCents=0,poolCents=0;
  const credit=(gameId:string,developerId:string,amount:number)=>{developerOf[gameId]=developerId;const r=allocations.get(gameId)??{gameId,amountCents:0,premiumSeconds:0,payingPlayers:0};r.amountCents+=amount;allocations.set(gameId,r);poolCents+=amount;};
  // Game subscriptions belong entirely to that game's creator after reported processing fees.
  // Subscription platform commission is intentionally not introduced without a business decision.
  for(const p of paid){if(!p.gameId)continue;const net=Math.max(0,p.amount-p.fee);grossCents+=p.amount;netCents+=net;credit(p.gameId,p.developerId,net);const set=players.get(p.gameId)??new Set<string>();set.add(p.userId);players.set(p.gameId,set);}
  for(const ad of ads){grossCents+=ad.amount;netCents+=ad.amount;credit(ad.gameId,ad.developerId,ad.share);}
  for(const [id,r] of allocations)r.payingPlayers=players.get(id)?.size??0;
  return {month,grossCents,netCents,poolCents,distributedCents:poolCents,platformCents:netCents-poolCents,games:[...allocations.values()],subscriberCount:new Set(paid.map(p=>p.userId)).size,devShareBps:5000,currency:s.currency,developerOf};

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
  const {adBalance}=await import("@/lib/ad-ledger");return adBalance(developerId);
}
