import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";

export const BEAT_INTERVAL_S = 30;
const MIN_GAP_S = 20;
const MAX_CREDIT_S = 30;
const MAX_SESSION_S = 6 * 3600;

const sign = (id: string) => createHmac("sha256", env.appSecret).update(`play:${id}`).digest("base64url").slice(0, 32);

export function playToken(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

export function verifyToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function startPlay(opts: { gameId: string; userId: string | null; visitorId: string; premium: boolean }) {
  const id = newId();
  const day = today();
  const playerKey = opts.userId ? `u:${opts.userId}` : `v:${opts.visitorId}`;
  await db.transaction(async (tx) => {
    await tx.insert(schema.playSessions).values({
      id,
      gameId: opts.gameId,
      userId: opts.userId,
      visitorId: opts.visitorId,
      premium: opts.premium,
    });
    const fresh = await tx
      .insert(schema.dailyGamePlayers)
      .values({ gameId: opts.gameId, day, playerKey })
      .onConflictDoNothing()
      .returning({ k: schema.dailyGamePlayers.playerKey });
    const unique = fresh.length;
    await tx
      .insert(schema.dailyGameStats)
      .values({ gameId: opts.gameId, day, plays: 1, uniquePlayers: unique })
      .onConflictDoUpdate({
        target: [schema.dailyGameStats.gameId, schema.dailyGameStats.day],
        set: {
          plays: sql`${schema.dailyGameStats.plays} + 1`,
          uniquePlayers: sql`${schema.dailyGameStats.uniquePlayers} + ${unique}`,
        },
      });
    await tx
      .update(schema.games)
      .set({ playCount: sql`${schema.games.playCount} + 1` })
      .where(eq(schema.games.id, opts.gameId));
  });
  return playToken(id);
}

/** Credit play time for one heartbeat. Returns credited seconds (0 when rejected). */
export async function heartbeat(token: string): Promise<number> {
  const id = verifyToken(token);
  if (!id) return 0;
  // Atomic: only one beat per MIN_GAP window, capped credit, capped session length.
  const updated = await db.execute<{ game_id: string; user_id: string | null; premium: boolean; credit: number }>(sql`
    with s as (
      select id, game_id, user_id, premium,
        least(${MAX_CREDIT_S}, floor(extract(epoch from now() - coalesce(last_beat_at, started_at))))::int as credit
      from play_sessions
      where id = ${id}
        and coalesce(last_beat_at, started_at) <= now() - make_interval(secs => ${MIN_GAP_S})
        and seconds < ${MAX_SESSION_S}
      for update
    )
    update play_sessions p set seconds = p.seconds + s.credit, last_beat_at = now()
    from s where p.id = s.id
    returning s.game_id, s.user_id, s.premium, s.credit
  `);
  const row = updated.rows[0];
  if (!row || row.credit <= 0) return 0;
  const credit = Number(row.credit);
  const premiumCredit = row.premium ? credit : 0;
  const day = today();
  await db
    .insert(schema.dailyGameStats)
    .values({ gameId: row.game_id, day, seconds: credit, premiumSeconds: premiumCredit })
    .onConflictDoUpdate({
      target: [schema.dailyGameStats.gameId, schema.dailyGameStats.day],
      set: {
        seconds: sql`${schema.dailyGameStats.seconds} + ${credit}`,
        premiumSeconds: sql`${schema.dailyGameStats.premiumSeconds} + ${premiumCredit}`,
      },
    });
  await db
    .update(schema.games)
    .set({ playSeconds: sql`${schema.games.playSeconds} + ${credit}` })
    .where(eq(schema.games.id, row.game_id));
  if (row.user_id) {
    await db
      .insert(schema.userGameDaily)
      .values({ userId: row.user_id, gameId: row.game_id, day, seconds: credit, premiumSeconds: premiumCredit })
      .onConflictDoUpdate({
        target: [schema.userGameDaily.userId, schema.userGameDaily.gameId, schema.userGameDaily.day],
        set: {
          seconds: sql`${schema.userGameDaily.seconds} + ${credit}`,
          premiumSeconds: sql`${schema.userGameDaily.premiumSeconds} + ${premiumCredit}`,
        },
      });
  }
  return credit;
}

export async function toggleLike(userId: string, gameId: string): Promise<boolean> {
  const day = today();
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.gameId, gameId)))
      .returning();
    const delta = removed.length ? -1 : 1;
    if (!removed.length) await tx.insert(schema.likes).values({ userId, gameId });
    await tx
      .update(schema.games)
      .set({ likeCount: sql`greatest(0, ${schema.games.likeCount} + ${delta})` })
      .where(eq(schema.games.id, gameId));
    await tx
      .insert(schema.dailyGameStats)
      .values({ gameId, day, likes: delta })
      .onConflictDoUpdate({
        target: [schema.dailyGameStats.gameId, schema.dailyGameStats.day],
        set: { likes: sql`${schema.dailyGameStats.likes} + ${delta}` },
      });
    return !removed.length;
  });
}
