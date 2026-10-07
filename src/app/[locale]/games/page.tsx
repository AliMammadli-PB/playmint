import {CategoryIcon} from "@/components/CategoryIcon";
import {CatalogShell,CatalogTabs} from "@/components/CatalogShell";
import Link from "next/link";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { listGames } from "@/lib/games";
import { GameGrid } from "@/components/GameCard";
import { categories, isCategory } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/[locale]/games">) {
  const { t } = await resolveLocale(params);
  return { title: t.browse.title };
}

export default async function Browse({ params, searchParams }: PageProps<"/[locale]/games">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const category = isCategory(sp.category) ? sp.category : undefined;
  const sort = sp.sort === "new" || sp.sort === "liked" || sp.sort === "trending" ? sp.sort : "popular";
  const featured=sp.featured==="1";
  const premium = sp.premium === "1";
  const games = await listGames({ q: q || undefined, category, sort, premium, featured, limit: 96 });

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, category, sort: sort === "popular" ? undefined : sort, premium: premium ? "1" : undefined, featured: featured ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/${locale}/games${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-mint bg-mint/15 text-mint" : "border-line bg-surface/70 text-muted hover:text-paper"}`;

  return (
    <CatalogShell locale={locale} active="browse" categoryLabels={t.categories}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="h1">{q ? fill(t.browse.resultsFor, { q }) : category ? t.categories[category] : t.browse.title}</h1>
          <p className="mt-1 text-sm text-muted">{fill(t.browse.count, { n: games.length })}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["popular", "trending", "new", "liked"] as const).map((s) => (
            <Link key={s} href={href({ sort: s === "popular" ? undefined : s })} className={chip(sort === s)}>
              {s === "trending" ? (locale==="en"?"Trending":locale==="az"?"Trend":"Trend") : s === "popular" ? t.browse.sortPopular : s === "new" ? t.browse.sortNew : t.browse.sortLiked}
            </Link>
          ))}
        </div>
      </div>
      <CatalogTabs locale={locale} active="browse"/>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Link href={href({ category: undefined })} className={chip(!category)}>
          {t.common.all}
        </Link>
        {categories.map((c) => (
          <Link key={c} href={href({ category: c })} className={chip(category === c)}>
            <span className="inline-flex items-center gap-2"><CategoryIcon category={c}/>{t.categories[c]}</span>
          </Link>
        ))}
        <Link href={href({ premium: premium ? undefined : "1" })} className={chip(premium)}>
          <span className="text-amber">★</span> {t.browse.premiumOnly}
        </Link>
      </div>
      <div className="mt-8">
        {games.length ? (
          <GameGrid games={games} locale={locale} t={t} />
        ) : (
          <div className="card p-12 text-center text-muted">{t.browse.empty}</div>
        )}
      </div>
    </CatalogShell>
  );
}
