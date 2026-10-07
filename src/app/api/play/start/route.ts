import { crossOrigin } from "@/lib/origin";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { startPlay, BEAT_INTERVAL_S } from "@/lib/play";
import { getVersion, playUrl } from "@/lib/games";
import { randomToken } from "@/lib/ids";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (crossOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { gameId?: string; previewVersionId?: string };
  if (!body.gameId) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!rateLimit(`start:${clientIp(await headers())}`, 60, 10 * 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const game = (await db.select().from(schema.games).where(eq(schema.games.id, body.gameId)).limit(1))[0];
  if (!game) return Response.json({ error: "not_found" }, { status: 404 });
  const user = await getCurrentUser();

  // Owner / admin preview of any version — never counted in stats.
  if (body.previewVersionId) {
    const v = await getVersion(body.previewVersionId);
    const allowed = user && (user.role === "admin" || user.id === game.developerId);
    if (!v || v.gameId !== game.id || !allowed) return Response.json({ error: "forbidden" }, { status: 403 });
    if(v.runtimeKind!=="browser"||!v.entry)return Response.json({error:"runtime_not_ready"},{status:409});
    return Response.json({ url: playUrl(v), token: null });
  }

  if (game.isDemo || game.status !== "published" || !game.liveVersionId) return Response.json({ error: "not_live" }, { status: 404 });
  const premium = await isPremium(user?.id, game.id);
  if (game.premiumOnly && !premium && user?.id !== game.developerId && user?.role !== "admin") {
    return Response.json({ error: "premium_required" }, { status: 402 });
  }
  const version = await getVersion(game.liveVersionId);
  if (!version || version.gameId!==game.id || version.status!=="approved" || !version.reviewedAt || !version.reviewedBy) return Response.json({ error: "not_live" }, { status: 404 });

  const jar = await cookies();
  let visitorId = jar.get("pm_vid")?.value;
  if (!visitorId || visitorId.length > 64) {
    visitorId = randomToken(16);
    jar.set("pm_vid", visitorId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400, secure: req.url.startsWith("https") });
  }
  const token = await startPlay({ gameId: game.id, userId: user?.id ?? null, visitorId, premium });
  return Response.json({ url: playUrl(version), token, interval: BEAT_INTERVAL_S });
}
