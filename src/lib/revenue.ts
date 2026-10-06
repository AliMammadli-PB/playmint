/**
 * User-centric revenue split.
 *
 * Every subscriber's net payment × developer share is divided only among the games
 * *that subscriber* played that month, proportional to their (daily-capped) play time,
 * boosted by each game's like ratio. Fake accounts can therefore only redistribute
 * their own money — they cannot dilute other subscribers' contributions.
 *
 * Subscribers who paid but played nothing feed an "unallocated" share that is spread
 * over all games by aggregate weight. Amounts are integer cents; rounding uses the
 * largest-remainder method so payouts sum exactly to the distributed pool.
 */

export type RevenueInput = {
  /** Net cents each subscriber paid in the period. */
  subscribers: { userId: string; netCents: number }[];
  /** Premium play seconds per user / game / day within the period. */
  plays: { userId: string; gameId: string; day: string; seconds: number }[];
  /** Like ratio per game in [0, 1]. */
  likeRatio: Record<string, number>;
  devShareBps: number;
  dailyCapSeconds: number;
  likeBonus: number;
};

export type GameShare = { gameId: string; amountCents: number; premiumSeconds: number; payingPlayers: number };

export type RevenueResult = {
  netCents: number;
  poolCents: number;
  distributedCents: number;
  platformCents: number;
  games: GameShare[];
};

export function splitRevenue(input: RevenueInput): RevenueResult {
  const { devShareBps, dailyCapSeconds, likeBonus } = input;
  const net = new Map<string, number>();
  for (const s of input.subscribers) net.set(s.userId, (net.get(s.userId) ?? 0) + Math.max(0, s.netCents));
  const netCents = [...net.values()].reduce((a, b) => a + b, 0);
  const poolCents = Math.floor((netCents * devShareBps) / 10000);

  // 1. Daily cap per subscriber (scale all games of that day proportionally).
  const dayTotals = new Map<string, number>();
  for (const p of input.plays) {
    if (!net.has(p.userId) || p.seconds <= 0) continue;
    const k = `${p.userId}|${p.day}`;
    dayTotals.set(k, (dayTotals.get(k) ?? 0) + p.seconds);
  }

  // 2. Per subscriber weights per game.
  const userWeights = new Map<string, Map<string, number>>();
  const cappedSeconds = new Map<string, number>();
  const players = new Map<string, Set<string>>();
  for (const p of input.plays) {
    if (!net.has(p.userId) || p.seconds <= 0) continue;
    const total = dayTotals.get(`${p.userId}|${p.day}`)!;
    const secs = total > dailyCapSeconds ? (p.seconds * dailyCapSeconds) / total : p.seconds;
    const ratio = Math.min(1, Math.max(0, input.likeRatio[p.gameId] ?? 0));
    const w = secs * (1 + likeBonus * ratio);
    let m = userWeights.get(p.userId);
    if (!m) userWeights.set(p.userId, (m = new Map()));
    m.set(p.gameId, (m.get(p.gameId) ?? 0) + w);
    cappedSeconds.set(p.gameId, (cappedSeconds.get(p.gameId) ?? 0) + secs);
    let s = players.get(p.gameId);
    if (!s) players.set(p.gameId, (s = new Set()));
    s.add(p.userId);
  }

  // 3. Distribute each subscriber's share; collect unallocated shares.
  const exact = new Map<string, number>();
  const globalWeight = new Map<string, number>();
  let unallocated = 0;
  for (const [userId, cents] of net) {
    const share = (cents * devShareBps) / 10000;
    const weights = userWeights.get(userId);
    const sum = weights ? [...weights.values()].reduce((a, b) => a + b, 0) : 0;
    if (!weights || sum <= 0) {
      unallocated += share;
      continue;
    }
    for (const [gameId, w] of weights) {
      exact.set(gameId, (exact.get(gameId) ?? 0) + (share * w) / sum);
      globalWeight.set(gameId, (globalWeight.get(gameId) ?? 0) + w);
    }
  }
  const globalSum = [...globalWeight.values()].reduce((a, b) => a + b, 0);
  if (unallocated > 0 && globalSum > 0) {
    for (const [gameId, w] of globalWeight) exact.set(gameId, (exact.get(gameId) ?? 0) + (unallocated * w) / globalSum);
  }

  // 4. Largest remainder rounding to whole cents.
  const totalExact = [...exact.values()].reduce((a, b) => a + b, 0);
  const target = Math.min(poolCents, Math.round(totalExact));
  const rows = [...exact.entries()].map(([gameId, v]) => ({ gameId, floor: Math.floor(v), rem: v - Math.floor(v) }));
  let left = target - rows.reduce((a, r) => a + r.floor, 0);
  rows.sort((a, b) => b.rem - a.rem || a.gameId.localeCompare(b.gameId));
  for (const r of rows) {
    if (left <= 0) break;
    r.floor += 1;
    left -= 1;
  }

  const games: GameShare[] = rows
    .map((r) => ({
      gameId: r.gameId,
      amountCents: r.floor,
      premiumSeconds: Math.round(cappedSeconds.get(r.gameId) ?? 0),
      payingPlayers: players.get(r.gameId)?.size ?? 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents || a.gameId.localeCompare(b.gameId));
  const distributedCents = games.reduce((a, g) => a + g.amountCents, 0);
  return { netCents, poolCents, distributedCents, platformCents: netCents - distributedCents, games };
}
