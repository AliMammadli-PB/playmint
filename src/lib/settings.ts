import "server-only";
import { db, schema } from "@/lib/db";

export type Settings = {
  /** Developer share of net subscription revenue, in basis points (7000 = 70%). */
  devShareBps: number;
  premiumPriceCents: number;
  currency: string;
  /** Payment provider fee estimate used when the provider does not report one. */
  paymentFeeBps: number;
  minPayoutCents: number;
  holdDays: number;
  /** Per subscriber per day: play time beyond this is ignored for revenue. */
  dailyCapSeconds: number;
  /** Max multiplier bonus from like ratio (0.15 → up to +15%). */
  likeBonus: number;
  /** Likes only count from accounts that played at least this long. */
  likeMinSeconds: number;
  maxZipMb: number;
};

export const defaultSettings: Settings = {
  devShareBps: 7000,
  premiumPriceCents: 499,
  currency: "USD",
  paymentFeeBps: 0,
  minPayoutCents: 5000,
  holdDays: 30,
  dailyCapSeconds: 3 * 3600,
  likeBonus: 0.15,
  likeMinSeconds: 120,
  maxZipMb: 50,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(schema.settings);
  const out: Settings = { ...defaultSettings };
  for (const row of rows) {
    if (row.key in out) (out as Record<string, unknown>)[row.key] = row.value;
  }
  return out;
}

export async function saveSettings(patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    await db
      .insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  }
}
