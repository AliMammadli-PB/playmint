import Link from "next/link";
import { resolveLocale } from "@/lib/i18n";
import { listGames } from "@/lib/games";
import { GameGrid } from "@/components/GameCard";
import { CatalogShell, CatalogEmpty } from "@/components/CatalogShell";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categories, type Category } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale, t } = await resolveLocale(params);
  const en = locale === "en";
  const az = locale === "az";
  const games = await listGames({ sort: "popular", limit: 12 });

  return (
    <CatalogShell locale={locale} active="home">
      <div className="home-open">
        <div>
          <h1>{en ? "Ready to play" : az ? "Oynamağa hazır" : "Oynamaya hazır"}</h1>
          <p>
            {en
              ? "Made by independent creators. Ready in your browser. No downloads, just play."
              : az
                ? "Müstəqil geliştiricilərin oyunları. Yükləmədən, brauzerində oyna."
                : "Bağımsız geliştiricilerin oyunları. İndirmeden, doğrudan tarayıcında oyna."}
          </p>
        </div>
        <div className="home-actions">
          <Link href={`/${locale}/games`} className="btn btn-primary">
            {en ? "Explore games" : az ? "Oyunları kəşf et" : "Oyunları keşfet"}
          </Link>
          <Link href={`/${locale}/developers`} className="btn btn-ghost">
            {en ? "Become a creator" : az ? "Geliştirici ol" : "Geliştirici ol"}
          </Link>
        </div>
      </div>

      <nav className="home-chips" aria-label={en ? "Game categories" : az ? "Oyun kateqoriyaları" : "Oyun kategorileri"}>
        {categories.map((category: Category) => (
          <Link key={category} href={`/${locale}/games?category=${category}`}>
            <CategoryIcon category={category} />
            {t.categories[category]}
          </Link>
        ))}
      </nav>

      <section className="home-shelf">
        <div className="section-heading">
          <h2>{en ? "Play now" : az ? "İndi oyna" : "Şimdi oyna"}</h2>
          <Link href={`/${locale}/games`} className="btn btn-ghost btn-sm">
            {t.common.seeAll}
          </Link>
        </div>
        {games.length ? <GameGrid games={games} locale={locale} t={t} /> : <CatalogEmpty locale={locale} />}
      </section>
    </CatalogShell>
  );
}
