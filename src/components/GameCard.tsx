import {CategoryIcon} from "./CategoryIcon";
import Link from "next/link";
import type { GameCardData } from "@/lib/games";
import { coverUrl } from "@/lib/games";
import { pickText } from "@/lib/i18n/text";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n";
import { num, money } from "@/lib/format";
import { isCategory } from "@/lib/catalog";

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
      <div className="space-y-1 p-3.5">
        <h3 className="truncate font-display text-[15px] font-bold">{game.title}</h3>
        <p className="text-[11px] text-mint">{game.subscriptionPriceCents>0?`${money(game.subscriptionPriceCents,game.subscriptionCurrency,locale)} / ${locale==="en"?"month":"ay"}`:t.common.free}</p>
        {pickText(game.tagline,locale)!==game.title&&<p className="line-clamp-1 text-xs text-muted">{pickText(game.tagline, locale)}</p>}
        <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted">{isCategory(game.category)&&<span className="inline-flex items-center gap-1.5"><CategoryIcon category={game.category} className="h-4 w-4"/>{t.categories[game.category]}</span>}</div><div className="flex items-center justify-between pt-1 text-[11px] text-faint">
          <span className="truncate">{game.developerName}</span>
          <span className="flex shrink-0 gap-2.5">
            <span>▶ {num(game.playCount, locale)}</span>
            <span>♥ {num(game.likeCount, locale)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function GameGrid({ games, locale, t }: { games: GameCardData[]; locale: Locale; t: Dict }) {
  return (
    <div className="game-grid">
      {games.map((g) => (
        <GameCard key={g.id} game={g} locale={locale} t={t} />
      ))}
    </div>
  );
}
