import "server-only";
import { and, eq, gt, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function getActiveSubscription(userId: string, gameId?: string) {
  const rows = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        gameId ? eq(schema.subscriptions.gameId, gameId) : undefined,
        eq(schema.subscriptions.status, "active"),
        gt(schema.subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(desc(schema.subscriptions.currentPeriodEnd))
    .limit(1);
  return rows[0] ?? null;
}

export async function isPremium(userId: string | null | undefined, gameId?: string): Promise<boolean> {
  if (!userId || !gameId) return false;
  return (await getActiveSubscription(userId, gameId)) !== null;
}
