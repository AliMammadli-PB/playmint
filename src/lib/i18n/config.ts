export const locales = ["tr", "az", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";
export const localeNames: Record<Locale, string> = { tr: "Türkçe", az: "Azərbaycanca", en: "English" };
export const localeCookie = "pm_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  const header = (acceptLanguage ?? "").toLowerCase();
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}
