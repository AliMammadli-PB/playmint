import Link from "next/link";
import type { GameCardData } from "@/lib/games";
import { coverUrl } from "@/lib/games";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n";
import { num, money } from "@/lib/format";

export function GameCardDetails({game,locale}:{game:GameCardData;locale:Locale}) {
  const labels=locale==="en"?{publisher:"Publisher",subscribers:"subscribers",plays:"plays"}:locale==="az"?{publisher:"Paylaşan",subscribers:"abunə",plays:"oynanış"}:{publisher:"Paylaşan",subscribers:"abone",plays:"oynanma"};
  const publisher=game.developerName||labels.publisher;
  return <div className="game-card-details">
    <div className="game-card-byline">
      <span className="game-card-author" title={publisher}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span className="game-card-author-name">{publisher}</span></span>
      <span className="game-card-followers" title={`${num(game.developerSubscriberCount,locale)} ${labels.subscribers}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></svg><span>{num(game.developerSubscriberCount,locale)}</span><span className="sr-only"> {labels.subscribers}</span></span>
    </div>
    <div className="game-card-plays"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg><span>{num(game.playCount,locale)} {labels.plays}</span></div>
  </div>;
}

export function Cover({ title, path, category, className = "" }: { title: string; path: string | null; category: string; className?: string }) {
  const url = coverUrl(path);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return <div className="flex h-full w-full items-center justify-center bg-surface-3" aria-label={title}><svg className="h-16 w-16 text-mint/60" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M21 17h22c8 0 13 9 15 22 2 11-5 15-11 8l-7-8H24l-7 8C11 54 4 50 6 39c2-13 7-22 15-22Z" stroke="currentColor" strokeWidth="3"/><path d="M18 25v12m-6-6h12" stroke="currentColor" strokeWidth="3"/><circle cx="44" cy="27" r="2" fill="currentColor"/><circle cx="50" cy="33" r="2" fill="currentColor"/></svg></div>;
}

export function GameCard({ game, locale, t }: { game: GameCardData; locale: Locale; t: Dict }) {
  return (
    <Link
      href={`/${locale}/g/${game.slug}`}
      className="game-tile group"
    >
      <div className="game-cover relative aspect-square overflow-hidden bg-surface-2">
        <Cover title={game.title} path={game.coverPath} category={game.category} className="transition duration-500 group-hover:scale-[1.04]" />
        {game.premiumOnly && (
          <span className="badge absolute left-2.5 top-2.5 bg-amber text-ink shadow">{t.common.premium}</span>
        )}
      </div>
      <div className="game-card-caption space-y-1">
        <h3 className="truncate font-display text-[15px] font-bold">{game.title}</h3>
        {game.subscriptionPriceCents>0&&<p className="text-[11px] text-mint">{money(game.subscriptionPriceCents,game.subscriptionCurrency,locale)} / {locale==="en"?"month":locale === "az" ? "ay" : "ay"}</p>}
        <GameCardDetails game={game} locale={locale}/>
      </div>
    </Link>
  );
}

export function GameGrid({ games, locale, t }: { games: GameCardData[]; locale: Locale; t: Dict }) {
  return (
    <div className="game-grid" data-count={games.length}>
      {games.map((g) => (
        <GameCard key={g.id} game={g} locale={locale} t={t} />
      ))}
    </div>
  );
}
