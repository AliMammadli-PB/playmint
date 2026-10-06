import { describe, expect, it } from "vitest";
import { splitRevenue, type RevenueInput } from "./revenue";

const base: Omit<RevenueInput, "subscribers" | "plays"> = {
  likeRatio: {},
  devShareBps: 7000,
  dailyCapSeconds: 3 * 3600,
  likeBonus: 0.15,
};

describe("splitRevenue", () => {
  it("gives each subscriber's share only to the games they played", () => {
    const r = splitRevenue({
      ...base,
      subscribers: [
        { userId: "a", netCents: 1000 },
        { userId: "b", netCents: 1000 },
      ],
      plays: [
        { userId: "a", gameId: "g1", day: "2026-10-01", seconds: 600 },
        { userId: "b", gameId: "g2", day: "2026-10-01", seconds: 60 },
      ],
    });
    expect(r.poolCents).toBe(1400);
    expect(r.games.find((g) => g.gameId === "g1")!.amountCents).toBe(700);
    expect(r.games.find((g) => g.gameId === "g2")!.amountCents).toBe(700);
    expect(r.platformCents).toBe(600);
  });

  it("bots cannot dilute other subscribers", () => {
    const plays = [{ userId: "real", gameId: "honest", day: "2026-10-01", seconds: 3600 }];
    for (let i = 0; i < 50; i++) plays.push({ userId: `bot${i}`, gameId: "scam", day: "2026-10-01", seconds: 99999 });
    const r = splitRevenue({
      ...base,
      subscribers: [{ userId: "real", netCents: 500 }],
      plays,
    });
    expect(r.games).toEqual([{ gameId: "honest", amountCents: 350, premiumSeconds: 3600, payingPlayers: 1 }]);
  });

  it("applies the daily cap proportionally", () => {
    const r = splitRevenue({
      ...base,
      subscribers: [{ userId: "a", netCents: 1000 }],
      plays: [
        { userId: "a", gameId: "g1", day: "2026-10-01", seconds: 6 * 3600 },
        { userId: "a", gameId: "g2", day: "2026-10-01", seconds: 6 * 3600 },
        { userId: "a", gameId: "g2", day: "2026-10-02", seconds: 3 * 3600 },
      ],
    });
    const g1 = r.games.find((g) => g.gameId === "g1")!;
    const g2 = r.games.find((g) => g.gameId === "g2")!;
    expect(g1.premiumSeconds).toBe(1.5 * 3600);
    expect(g2.premiumSeconds).toBe(4.5 * 3600);
    expect(g1.amountCents).toBe(175);
    expect(g2.amountCents).toBe(525);
  });

  it("boosts liked games", () => {
    const r = splitRevenue({
      ...base,
      likeRatio: { liked: 1 },
      subscribers: [{ userId: "a", netCents: 2150 }],
      plays: [
        { userId: "a", gameId: "liked", day: "2026-10-01", seconds: 100 },
        { userId: "a", gameId: "plain", day: "2026-10-01", seconds: 100 },
      ],
    });
    const liked = r.games.find((g) => g.gameId === "liked")!.amountCents;
    const plain = r.games.find((g) => g.gameId === "plain")!.amountCents;
    expect(liked / plain).toBeCloseTo(1.15, 2);
  });

  it("spreads idle subscribers over all games and rounds to exactly the pool", () => {
    const r = splitRevenue({
      ...base,
      subscribers: [
        { userId: "a", netCents: 333 },
        { userId: "idle", netCents: 777 },
      ],
      plays: [
        { userId: "a", gameId: "g1", day: "2026-10-01", seconds: 1 },
        { userId: "a", gameId: "g2", day: "2026-10-01", seconds: 1 },
        { userId: "a", gameId: "g3", day: "2026-10-01", seconds: 1 },
      ],
    });
    expect(r.distributedCents).toBe(r.poolCents);
    expect(r.poolCents).toBe(777);
    expect(r.distributedCents + r.platformCents).toBe(r.netCents);
  });

  it("keeps everything for the platform when nobody played", () => {
    const r = splitRevenue({ ...base, subscribers: [{ userId: "a", netCents: 499 }], plays: [] });
    expect(r.games).toEqual([]);
    expect(r.platformCents).toBe(499);
  });
});
