import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { gameFilesBase } from "@/lib/env";

const g = schema.games;
const d = schema.developerProfiles;

export const cardFields = {
  id: g.id,
  slug: g.slug,
  title: g.title,
  tagline: g.tagline,
  category: g.category,
  coverPath: g.coverPath,
  premiumOnly: g.premiumOnly,
  likeCount: g.likeCount,
  playCount: g.playCount,
  developerName: d.displayName,
  developerHandle: d.handle,
};

export type GameCardData = {
  id: string;
  slug: string;
  title: string;
  tagline: schema.I18nText;
  category: string;
  coverPath: string | null;
  premiumOnly: boolean;
  likeCount: number;
  playCount: number;
  developerName: string | null;
  developerHandle: string | null;
};

export type ListOptions = {
  sort?: "popular" | "new" | "liked";
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
  const where: SQL[] = [eq(g.status, "published"), sql`${g.liveVersionId} is not null`];
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
      : opts.sort === "liked"
        ? [desc(g.likeCount), desc(g.playCount)]
        : [desc(sql`${g.playCount} + ${g.likeCount} * 5`), desc(g.publishedAt)];
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
  return `${gameFilesBase()}/${version.id}/${version.entry.split("/").map(encodeURIComponent).join("/")}`;
}

export function coverUrl(coverPath: string | null) {
  return coverPath ? `/media/covers/${coverPath}` : null;
}

export async function siteStats() {
  const rows = await db.execute<{ games: string; devs: string; plays: string }>(sql`
    select
      (select count(*) from games where status = 'published' and live_version_id is not null) as games,
      (select count(distinct developer_id) from games where status = 'published' and live_version_id is not null) as devs,
      (select coalesce(sum(play_count), 0) from games) as plays
  `);
  const r = rows.rows[0];
  return { games: Number(r.games), devs: Number(r.devs), plays: Number(r.plays) };
}

export async function categoryCounts() {
  const rows = await db
    .select({ category: g.category, n: sql<number>`count(*)::int` })
    .from(g)
    .where(and(eq(g.status, "published"), sql`${g.liveVersionId} is not null`))
    .groupBy(g.category);
  return Object.fromEntries(rows.map((r) => [r.category, r.n])) as Record<string, number>;
}
