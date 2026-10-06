import Link from "next/link";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { categoryCounts, listGames, siteStats } from "@/lib/games";
import { getSettings } from "@/lib/settings";
import { GameCard, GameGrid } from "@/components/GameCard";
import { categories, categoryEmoji } from "@/lib/catalog";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  const [settings, stats, featured, popular, newest, liked, counts] = await Promise.all([
    getSettings(),
    siteStats(),
    listGames({ featured: true, limit: 6 }),
    listGames({ sort: "popular", limit: 8 }),
    listGames({ sort: "new", limit: 8 }),
    listGames({ sort: "liked", limit: 8 }),
    categoryCounts(),
  ]);
  const share = Math.round(settings.devShareBps / 100);
  const hero = featured[0] ?? popular[0];

  return (
    <div>
      <section className="container-pm grid items-center gap-10 pb-12 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">{t.home.eyebrow}</p>
          <h1 className="mt-4 whitespace-pre-line font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            {t.home.title.split("\n").map((line, i) => (
              <span key={i} className={i === 0 ? "block" : "block text-mint"}>
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{fill(t.home.subtitle, { share })}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/games`} className="btn btn-primary px-6 py-3 text-base">
              ▶ {t.home.ctaPlay}
            </Link>
            <Link href={`/${locale}/developers`} className="btn btn-ghost px-6 py-3 text-base">
              {t.home.ctaDev} →
            </Link>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            {[
              [stats.games, t.home.statsGames],
              [stats.devs, t.home.statsDevs],
              [stats.plays, t.home.statsPlays],
            ].map(([n, label]) => (
              <div key={String(label)}>
                <dt className="font-display text-2xl font-bold tabular-nums">{num(Number(n), locale)}</dt>
                <dd className="text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        {hero ? (
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-mint/10 blur-3xl" />
            <GameCard game={hero} locale={locale} t={t} />
          </div>
        ) : (
          <div className="card flex aspect-video items-center justify-center p-8 text-center text-muted">
            <div>
              <div className="text-5xl">🎮</div>
              <p className="mt-4">{t.home.empty}</p>
              <Link href={`/${locale}/developers`} className="btn btn-primary mt-5">
                {t.home.ctaDev}
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="container-pm">
        <h2 className="h2 mb-4">{t.home.categories}</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/${locale}/games?category=${c}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2 text-sm hover:border-mint/50"
            >
              <span>{categoryEmoji[c]}</span>
              <span className="font-medium">{t.categories[c]}</span>
              {counts[c] ? <span className="text-xs text-faint">{counts[c]}</span> : null}
            </Link>
          ))}
        </div>
      </section>

      {[
        [t.home.featured, featured.slice(hero === featured[0] ? 1 : 0), "popular"],
        [t.home.popular, popular, "popular"],
        [t.home.newest, newest, "new"],
        [t.home.mostLiked, liked, "liked"],
      ].map(([title, games, sort]) =>
        (games as typeof popular).length ? (
          <section key={String(title)} className="container-pm mt-12">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="h2">{String(title)}</h2>
              <Link href={`/${locale}/games?sort=${sort}`} className="text-sm font-medium text-mint hover:underline">
                {t.common.seeAll} →
              </Link>
            </div>
            <GameGrid games={games as typeof popular} locale={locale} t={t} />
          </section>
        ) : null,
      )}
    </div>
  );
}
