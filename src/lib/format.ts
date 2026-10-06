import type { Locale } from "@/lib/i18n/config";

const intlLocale: Record<Locale, string> = { tr: "tr-TR", az: "az-AZ", en: "en-US" };

export function money(cents: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency }).format(cents / 100);
}

export function num(n: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], { notation: n >= 100_000 ? "compact" : "standard" }).format(n);
}

export function hours(seconds: number, locale: Locale) {
  const h = seconds / 3600;
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: h < 10 ? 1 : 0 }).format(h);
}

export function minutes(seconds: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(seconds / 60);
}

export function date(d: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium" }).format(new Date(d));
}

export function monthLabel(month: string, locale: Locale) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
