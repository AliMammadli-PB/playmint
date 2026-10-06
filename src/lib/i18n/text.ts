import type { I18nText } from "@/lib/db/schema";
import type { Locale } from "./config";

/** Pick the best available translation, falling back through tr → en → az. */
export function pickText(value: I18nText | null | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] || value.tr || value.en || value.az || "";
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
