export const categories = [
  "action",
  "arcade",
  "puzzle",
  "platformer",
  "racing",
  "shooter",
  "strategy",
  "sports",
  "adventure",
  "casual",
  "multiplayer",
  "educational",
] as const;
export type Category = (typeof categories)[number];

export const categoryEmoji: Record<Category, string> = {
  action: "⚡",
  arcade: "🕹️",
  puzzle: "🧩",
  platformer: "🍄",
  racing: "🏁",
  shooter: "🎯",
  strategy: "♟️",
  sports: "⚽",
  adventure: "🗺️",
  casual: "🍬",
  multiplayer: "👥",
  educational: "📚",
};

export const licenses = [
  { id: "MIT", url: "https://opensource.org/license/mit" },
  { id: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  { id: "GPL-3.0", url: "https://www.gnu.org/licenses/gpl-3.0.html" },
  { id: "MPL-2.0", url: "https://www.mozilla.org/MPL/2.0/" },
  { id: "BSD-3-Clause", url: "https://opensource.org/license/bsd-3-clause" },
  { id: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  { id: "CC-BY-SA-4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { id: "Unlicense", url: "https://unlicense.org/" },
] as const;

export const isCategory = (v: unknown): v is Category => categories.includes(v as Category);
export const isLicense = (v: unknown) => licenses.some((l) => l.id === v);

export const slugRe = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
export const handleRe = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

export function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", ə: "e", Ə: "e" };
  return input
    .toLowerCase()
    .replace(/[çğıİöşüəƏ]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
