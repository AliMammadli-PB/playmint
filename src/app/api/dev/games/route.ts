import { crossOrigin } from "@/lib/origin";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { isLocale } from "@/lib/i18n/config";
import { parseGameMeta, saveCover } from "@/lib/game-form";
import { createVersion } from "@/lib/versions";
import { getSettings } from "@/lib/settings";
import { newId } from "@/lib/ids";
import { ZipError } from "@/lib/zip";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** Create a new game with its first version (multipart: metadata + zip + optional cover). */
export async function POST(req: Request) {
  if (crossOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || (user.role !== "developer" && user.role !== "admin")) return Response.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData();
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as "tr") : "tr";
  const t = getDict(locale);
  if (!rateLimit(`upload:${user.id}`, 20, 3600_000)) return Response.json({ error: t.common.rateLimited }, { status: 429 });

  const parsed = parseGameMeta(form, t);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  if (form.get("openSource") !== "on") return Response.json({ error: t.dev.errors.openSourceRequired }, { status: 400 });
  const { meta } = parsed;
  const taken = await db.select({ id: schema.games.id }).from(schema.games).where(eq(schema.games.slug, meta.slug));
  if (taken.length) return Response.json({ error: t.dev.errors.slugTaken }, { status: 400 });

  const zip = form.get("zip");
  if (!(zip instanceof File)) return Response.json({ error: t.dev.errors.zip_missing }, { status: 400 });

  const gameId = newId();
  const cover = await saveCover(form.get("cover"), gameId);
  if (cover === "invalid") return Response.json({ error: t.dev.errors.cover_invalid }, { status: 400 });

  await db.insert(schema.games).values({ id: gameId, developerId: user.id, ...meta, coverPath: cover });
  const settings = await getSettings();
  try {
    await createVersion(gameId, zip, String(form.get("changelog") ?? ""), settings.maxZipMb);
  } catch (err) {
    await db.delete(schema.games).where(eq(schema.games.id, gameId));
    if (err instanceof ZipError) {
      const msg = (t.dev.errors as Record<string, string>)[err.code] ?? t.common.error;
      return Response.json({ error: fill(msg, { detail: err.detail }) }, { status: 400 });
    }
    console.error("upload failed", err);
    return Response.json({ error: t.common.error }, { status: 500 });
  }
  await audit(user.id, "game.create", gameId, { slug: meta.slug });
  return Response.json({ ok: true, gameId });
}
