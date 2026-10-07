"use server";

import {getStarterCounters} from "@/lib/catalogue-seed";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toggleLike } from "@/lib/play";
import { rateLimit } from "@/lib/rate-limit";

export async function toggleLikeAction(gameId: string): Promise<{ liked: boolean; count: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "login" };
  if (!rateLimit(`like:${user.id}`, 30, 60_000)) return { error: "rate" };
  const game = (await db.select({ id: schema.games.id }).from(schema.games).where(eq(schema.games.id, gameId)))[0];
  if (!game) return { error: "not_found" };
  const liked = await toggleLike(user.id, gameId);
  const count = (await db.select({ c: schema.games.likeCount }).from(schema.games).where(eq(schema.games.id, gameId)))[0].c;
  return { liked, count:count+(await getStarterCounters(gameId)).likes };
}
