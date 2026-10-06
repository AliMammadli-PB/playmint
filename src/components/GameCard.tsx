import Link from "next/link";
import type { GameCardData } from "@/lib/games";
import { coverUrl } from "@/lib/games";
import { pickText } from "@/lib/i18n/text";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n";
import { num } from "@/lib/format";
import { categoryEmoji, isCategory } from "@/lib/catalog";

export function Cover({ title, path, category, className = "" }: { title: string; path: string | null; category: string; className?: string }) {
  const url = coverUrl(path);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  let hash = 0;
  for (const c of title) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = 120 + (hash % 120);
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `radial-gradient(circle at 30% 20%, hsl(${hue} 70% 32%), hsl(${hue + 30} 60% 10%))` }}
    >
      <span className="text-5xl drop-shadow-lg">{isCategory(category) ? categoryEmoji[category] : "🎮"}</span>
    </div>
  );
}

export function GameCard({ game, locale, t }: { game: GameCardData; locale: Locale; t: Dict }) {
  return (
    <Link
      href={`/${locale}/g/${game.slug}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-surface/70 transition hover:-translate-y-0.5 hover:border-mint/40 hover:shadow-[0_12px_40px_-12px_rgb(61_255_176/0.25)]"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <Cover title={game.title} path={game.coverPath} category={game.category} className="transition duration-500 group-hover:scale-[1.04]" />
        {game.premiumOnly && (
          <span className="badge absolute left-2.5 top-2.5 bg-amber text-ink shadow">★ {t.common.premium}</span>
        )}
      </div>
      <div className="space-y-1 p-3.5">
        <h3 className="truncate font-display text-[15px] font-bold">{game.title}</h3>
        <p className="line-clamp-1 text-xs text-muted">{pickText(game.tagline, locale)}</p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-faint">
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {games.map((g) => (
        <GameCard key={g.id} game={g} locale={locale} t={t} />
      ))}
    </div>
  );
}
