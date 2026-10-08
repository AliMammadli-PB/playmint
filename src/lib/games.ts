import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { gameFilesBase } from "@/lib/env";

import {starterCounter} from "./catalogue-seed";
const g = schema.games;
const starterPlays=starterCounter(g.id,"plays"),starterLikes=starterCounter(g.id,"likes");
const displayedPlays=sql<number>`${g.playCount} + ${starterPlays}`,displayedLikes=sql<number>`${g.likeCount} + ${starterLikes}`;
const d = schema.developerProfiles;
/** Every public catalogue surface uses the same reviewed, non-demo live-version policy. */
export const publicGameCondition = and(eq(g.status,"published"),eq(g.isDemo,false),sql`exists (select 1 from game_versions v where v.id = ${g.liveVersionId} and v.game_id = ${g.id} and v.status = 'approved' and v.reviewed_at is not null and v.reviewed_by is not null)`)!;


export const cardFields = {
  id: g.id,
  slug: g.slug,
  title: g.title,
  tagline: g.tagline,
  category: g.category,
  coverPath: g.coverPath,
  premiumOnly: g.premiumOnly,
  subscriptionPriceCents:g.subscriptionPriceCents,
  subscriptionCurrency:g.subscriptionCurrency,
  likeCount: displayedLikes,
  playCount: displayedPlays,
  developerName: sql<string>`coalesce(${d.displayName}, (select name from users where id=${g.developerId}))`,
  developerHandle: d.handle,
  developerSubscriberCount: sql<number>`(select count(*)::int from user_follows uf join users member on member.id=uf.follower_id where uf.following_id=${g.developerId} and member.banned=false)`,
};

export type GameCardData = {
  id: string;
  slug: string;
  title: string;
  tagline: schema.I18nText;
  category: string;
  coverPath: string | null;
  premiumOnly: boolean;
  subscriptionPriceCents:number;
  subscriptionCurrency:string;
  likeCount: number;
  playCount: number;
  developerName: string | null;
  developerHandle: string | null;
  developerSubscriberCount: number;
};

export type ListOptions = {
  sort?: "popular" | "new" | "liked" | "trending";
  category?: string;
  q?: string;
  premium?: boolean;
  featured?: boolean;
  developerId?: string;
  excludeId?: string;
  limit?: number;
  offset?: number;
};

export async function listGames(opts: ListOptions = {}): Promise<GameCardData[]> {
  const where: SQL[] = [publicGameCondition];
  if (opts.category) where.push(eq(g.category, opts.category));
  if (opts.premium) where.push(eq(g.premiumOnly, true));
  if (opts.featured) where.push(eq(g.featured, true));
  if (opts.developerId) where.push(eq(g.developerId, opts.developerId));
  if (opts.excludeId) where.push(sql`${g.id} <> ${opts.excludeId}`);
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(g.title, like), ilike(d.displayName, like), sql`array_to_string(${g.tags}, ' ') ilike ${like}`)!);
  }
  const order =
    opts.sort === "new"
      ? [desc(g.publishedAt)]
      : opts.sort === "trending"
        ? [desc(sql`coalesce((select sum(s.plays) from daily_game_stats s where s.game_id = ${g.id} and s.day >= current_date - 6),0)`),desc(g.publishedAt)]
      : opts.sort === "liked"
        ? [desc(displayedLikes), desc(displayedPlays)]
        : [desc(sql`${displayedPlays} + ${displayedLikes} * 5`), desc(g.publishedAt)];
  return db
    .select(cardFields)
    .from(g)
    .leftJoin(d, eq(d.userId, g.developerId))
    .where(and(...where))
    .orderBy(...order)
    .limit(opts.limit ?? 24)
    .offset(opts.offset ?? 0);
}

export async function getGameBySlug(slug: string) {
  const rows = await db
    .select({ game: g, dev: d })
    .from(g)
    .leftJoin(d, eq(d.userId, g.developerId))
    .where(eq(g.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getVersion(id: string) {
  const rows = await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id, id)).limit(1);
  return rows[0] ?? null;
}

export function playUrl(version: { id: string; entry: string }) {
  return `${gameFilesBase()}/${version.id}/${version.entry.split("/").map(encodeURIComponent).join("/")}?pm_runtime=3`;
}

export function coverUrl(coverPath: string | null) {
  return coverPath ? `/media/covers/${coverPath}` : null;
}

export async function siteStats() {
  const [row] = await db.select({games:sql<number>`count(*)::int`,devs:sql<number>`count(distinct ${g.developerId})::int`,plays:sql<number>`coalesce(sum(${g.playCount}),0)::int`}).from(g).where(publicGameCondition);
  return row;

}

export async function categoryCounts() {
  const rows = await db
    .select({ category: g.category, n: sql<number>`count(*)::int` })
    .from(g)
    .where(publicGameCondition)
    .groupBy(g.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.n])) as Record<string, number>;
}
