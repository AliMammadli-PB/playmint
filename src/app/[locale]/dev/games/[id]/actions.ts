"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { deleteCover, parseGameMeta, saveCover } from "@/lib/game-form";

export type EditState = { error?: string; ok?: boolean } | null;

export async function updateGameAction(_prev: EditState, form: FormData): Promise<EditState> {
  const locale: Locale = isLocale(form.get("locale")) ? (form.get("locale") as Locale) : "tr";
  const t = getDict(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.common.error };
  const id = String(form.get("gameId") ?? "");
  const owner = user.role === "admin" ? undefined : eq(schema.games.developerId, user.id);
  const game = (await db.select().from(schema.games).where(and(eq(schema.games.id, id), owner)))[0];
  if (!game) return { error: t.dev.errors.not_found };

  const parsed = parseGameMeta(form, t);
  if ("error" in parsed) return { error: parsed.error };
  const { meta } = parsed;
  const clash = await db
    .select({ id: schema.games.id })
    .from(schema.games)
    .where(and(eq(schema.games.slug, meta.slug), ne(schema.games.id, id)));
  if (clash.length) return { error: t.dev.errors.slugTaken };

  const cover = await saveCover(form.get("cover"), id);
  if (cover === "invalid") return { error: t.dev.errors.cover_invalid };
  if (cover) await deleteCover(game.coverPath);

  await db
    .update(schema.games)
    .set({ ...meta, coverPath: cover ?? game.coverPath, updatedAt: new Date() })
    .where(eq(schema.games.id, id));
  revalidatePath(`/${locale}/dev/games/${id}`);
  return { ok: true };
}
