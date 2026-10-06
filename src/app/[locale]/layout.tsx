import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDict } from "@/lib/i18n";
import { isLocale, locales } from "@/lib/i18n/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin", "latin-ext"], display: "swap" });
const body = Geist({ variable: "--font-body", subsets: ["latin", "latin-ext"], display: "swap" });

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
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%230f2a20'/%3E%3Cpath d='M11 9.5v13l11-6.5z' fill='%233dffb0'/%3E%3C/svg%3E",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header locale={locale} t={t} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} t={t} />
      </body>
    </html>
  );
}
