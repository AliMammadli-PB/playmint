import "server-only";
import { and, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type DayStat = { day: string; plays: number; unique: number; seconds: number; premiumSeconds: number; likes: number };

export async function dailyStats(gameIds: string[], days = 30): Promise<DayStat[]> {
  const since = new Date(Date.now() - (days - 1) * 86400_000).toISOString().slice(0, 10);
  const rows = gameIds.length
    ? await db
        .select({
          day: schema.dailyGameStats.day,
          plays: sql<number>`sum(${schema.dailyGameStats.plays})::int`,
          unique: sql<number>`sum(${schema.dailyGameStats.uniquePlayers})::int`,
          seconds: sql<number>`sum(${schema.dailyGameStats.seconds})::bigint`,
          premiumSeconds: sql<number>`sum(${schema.dailyGameStats.premiumSeconds})::bigint`,
          likes: sql<number>`sum(${schema.dailyGameStats.likes})::int`,
        })
        .from(schema.dailyGameStats)
        .where(and(inArray(schema.dailyGameStats.gameId, gameIds), gte(schema.dailyGameStats.day, since)))
        .groupBy(schema.dailyGameStats.day)
    : [];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DayStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const r = byDay.get(day);
    out.push({
      day,
      plays: Number(r?.plays ?? 0),
      unique: Number(r?.unique ?? 0),
      seconds: Number(r?.seconds ?? 0),
      premiumSeconds: Number(r?.premiumSeconds ?? 0),
      likes: Number(r?.likes ?? 0),
    });
  }
  return out;
}

export function sumStats(days: DayStat[]) {
  return days.reduce(
    (a, d) => ({
      plays: a.plays + d.plays,
      unique: a.unique + d.unique,
      seconds: a.seconds + d.seconds,
      premiumSeconds: a.premiumSeconds + d.premiumSeconds,
      likes: a.likes + d.likes,
    }),
    { plays: 0, unique: 0, seconds: 0, premiumSeconds: 0, likes: 0 },
  );
}
