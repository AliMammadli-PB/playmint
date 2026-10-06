import "server-only";
import { notFound } from "next/navigation";
import tr, { type Dict } from "./dict/tr";
import en from "./dict/en";
import az from "./dict/az";
import { isLocale, type Locale } from "./config";

const dicts: Record<Locale, Dict> = { tr, en, az };

export function getDict(locale: Locale): Dict {
  return dicts[locale];
}

/** Resolve the [locale] route param or 404. */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<{ locale: Locale; t: Dict }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, t: dicts[locale] };
}

export type { Dict };
