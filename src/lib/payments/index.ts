import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { getSettings } from "@/lib/settings";

/**
 * Payment provider boundary. Only the mock provider exists today; a real provider
 * (Paddle, iyzico, …) implements the same interface and confirms payments via webhook,
 * calling `recordPayment` + `extendSubscription`.
 */
export interface PaymentProvider {
  id: string;
  /** Returns a URL to send the user to. */
  startCheckout(userId: string, returnUrl: string): Promise<string>;
  cancel(subscriptionId: string): Promise<void>;
}

const PERIOD_DAYS = 30;

export async function extendSubscription(userId: string, provider: string, providerRef = "") {
  const now = Date.now();
  const existing = (
    await db
      .select()
      .from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, "active")))
      .orderBy(desc(schema.subscriptions.currentPeriodEnd))
      .limit(1)
  )[0];
  if (existing && existing.currentPeriodEnd.getTime() > now) {
    const end = new Date(existing.currentPeriodEnd.getTime() + PERIOD_DAYS * 86400_000);
    await db
      .update(schema.subscriptions)
      .set({ currentPeriodEnd: end, cancelAtPeriodEnd: false })
      .where(eq(schema.subscriptions.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await db.insert(schema.subscriptions).values({
    id,
    userId,
    provider,
    providerRef,
    currentPeriodEnd: new Date(now + PERIOD_DAYS * 86400_000),
  });
  return id;
}

export async function recordPayment(p: {
  userId: string;
  subscriptionId: string | null;
  provider: string;
  amountCents: number;
  feeCents?: number;
  currency: string;
  test?: boolean;
}) {
  await db.insert(schema.payments).values({
    id: newId(),
    userId: p.userId,
    subscriptionId: p.subscriptionId,
    provider: p.provider,
    amountCents: p.amountCents,
    feeCents: p.feeCents ?? 0,
    currency: p.currency,
    test: p.test ?? false,
  });
}

/** Test-mode provider: payment succeeds instantly, no money moves. */
export const mockProvider: PaymentProvider = {
  id: "mock",
  async startCheckout(userId, returnUrl) {
    const s = await getSettings();
    const subId = await extendSubscription(userId, "mock");
    await recordPayment({
      userId,
      subscriptionId: subId,
      provider: "mock",
      amountCents: s.premiumPriceCents,
      currency: s.currency,
      test: true,
    });
    return returnUrl;
  },
  async cancel(subscriptionId) {
    await db
      .update(schema.subscriptions)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(schema.subscriptions.id, subscriptionId));
  },
};

export const paymentProvider: PaymentProvider = mockProvider;
