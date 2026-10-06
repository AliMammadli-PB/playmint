import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Dict } from "@/lib/i18n";
import type { I18nText } from "@/lib/db/schema";
import { isCategory, isLicense, slugRe } from "@/lib/catalog";
import { paths } from "@/lib/env";
import { randomToken } from "@/lib/ids";

export type GameMeta = {
  title: string;
  slug: string;
  category: string;
  tagline: I18nText;
  description: I18nText;
  tags: string[];
  license: string;
  orientation: string;
  premiumOnly: boolean;
};

const str = (form: FormData, k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);

export function parseGameMeta(form: FormData, t: Dict): { meta: GameMeta } | { error: string } {
  const e = t.dev.errors;
  const title = str(form, "title", 60);
  const slug = str(form, "slug", 40).toLowerCase();
  const category = str(form, "category", 30);
  const license = str(form, "license", 30);
  const orientation = ["landscape", "portrait", "any"].includes(str(form, "orientation", 12)) ? str(form, "orientation", 12) : "landscape";
  const tagline: I18nText = {};
  const description: I18nText = {};
  for (const l of ["tr", "az", "en"] as const) {
    const tg = str(form, `tagline_${l}`, 120);
    const ds = str(form, `description_${l}`, 4000);
    if (tg) tagline[l] = tg;
    if (ds) description[l] = ds;
  }
  const tags = [
    ...new Set(
      str(form, "tags", 200)
        .split(",")
        .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9çğıöşüə -]/g, "").slice(0, 24))
        .filter(Boolean),
    ),
  ].slice(0, 8);
  if (!title) return { error: e.titleRequired };
  if (!slugRe.test(slug)) return { error: e.slugInvalid };
  if (!isCategory(category)) return { error: e.categoryInvalid };
  if (!isLicense(license)) return { error: e.licenseInvalid };
  if (!tagline.tr) return { error: e.taglineRequired };
  return { meta: { title, slug, category, tagline, description, tags, license, orientation, premiumOnly: form.get("premiumOnly") === "on" } };
}

const MAX_COVER = 2 * 1024 * 1024;

function imageExt(buf: Buffer): "png" | "jpg" | "webp" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Validate and store a cover; returns the stored file name, null when no file was sent. */
export async function saveCover(file: FormDataEntryValue | null, gameId: string): Promise<string | null | "invalid"> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_COVER) return "invalid";
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = imageExt(buf);
  if (!ext) return "invalid";
  const name = `${gameId}-${randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "")}.${ext}`;
  await fs.mkdir(paths.covers(), { recursive: true });
  await fs.writeFile(path.join(paths.covers(), name), buf);
  return name;
}

export async function deleteCover(name: string | null) {
  if (name && /^[a-z0-9-]+\.(png|jpg|webp)$/.test(name)) await fs.rm(path.join(paths.covers(), name), { force: true });
}
