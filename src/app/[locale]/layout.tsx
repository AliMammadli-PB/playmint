import type { Metadata } from "next";
import {LocaleDocument} from "@/components/LocaleDocument";
import { notFound } from "next/navigation";

import { getDict } from "@/lib/i18n";
import { isLocale, locales } from "@/lib/i18n/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t.meta.title, template: "%s · Playmint" },
    description: t.meta.description,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    openGraph: { siteName: "Playmint", type: "website" },
    icons: {
      icon: "/brand/logo.png",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  return (
    <>
        <LocaleDocument locale={locale}/>
        <Header locale={locale} t={t} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} t={t} />
    </>
  );
}
