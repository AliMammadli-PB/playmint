import {getStarterCounters} from "@/lib/catalogue-seed";
import {profileById} from "@/lib/community";
import {FollowButton} from "@/components/FollowButton";
import {CategoryIcon} from "@/components/CategoryIcon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { fill, pickText } from "@/lib/i18n/text";
import { getGameBySlug, getVersion, listGames, coverUrl } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { gameSubscriptionAction } from "./subscription-actions";
import { getActiveSubscription, isPremium } from "@/lib/premium";
import { db, schema } from "@/lib/db";
import { gameSandbox } from "@/lib/env";
import { licenses, isCategory, categoryEmoji } from "@/lib/catalog";
import { date, hours, num, money } from "@/lib/format";
import { Cover, GameGrid } from "@/components/GameCard";
import { Player } from "./Player";
import { LikeButton } from "./LikeButton";

export async function generateMetadata({ params }: PageProps<"/[locale]/g/[slug]">) {
  const { locale } = await resolveLocale(params);
  const { slug } = await params;
  const row = await getGameBySlug(slug);
  if (!row) return {};
  const cover = coverUrl(row.game.coverPath);
  return {
    title: row.game.title,
    description: pickText(row.game.tagline, locale),
    openGraph: cover ? { images: [cover] } : undefined,
  };
}

export default async function GamePage({ params, searchParams }: PageProps<"/[locale]/g/[slug]">) {
  const { locale, t } = await resolveLocale(params);
  const { slug } = await params;
  const sp = await searchParams;
  const row = await getGameBySlug(slug);
  if (!row) notFound();
  const { game, dev } = row;
  const starter=await getStarterCounters(game.id);
  const displayPlays=game.playCount+starter.plays,displayLikes=game.likeCount+starter.likes;
  const user = await getCurrentUser();
  const canManage = !!user && (user.role === "admin" || user.id === game.developerId);

  const previewId = typeof sp.preview === "string" && canManage ? sp.preview : undefined;
  const liveVersion=game.liveVersionId?await getVersion(game.liveVersionId):null;
  const isLive = !game.isDemo && game.status === "published" && liveVersion?.gameId===game.id && liveVersion.status === "approved" && !!liveVersion.reviewedAt && !!liveVersion.reviewedBy;
  if (!isLive && !canManage) notFound();

  const version = previewId ? await getVersion(previewId) : game.liveVersionId ? await getVersion(game.liveVersionId) : null;
  if (previewId && (!version || version.gameId !== game.id)) notFound();

  const [premium, likedRow, more, recommended] = await Promise.all([
    isPremium(user?.id, game.id),
    user
      ? db.select().from(schema.likes).where(and(eq(schema.likes.userId, user.id), eq(schema.likes.gameId, game.id))).limit(1)
      : Promise.resolve([]),
    listGames({ developerId: game.developerId, excludeId: game.id, limit: 4 }),
    listGames({excludeId:game.id,limit:12,sort:"popular"}),
  ]);
  const subscription = user ? await getActiveSubscription(user.id,game.id) : null;
  const locked = game.premiumOnly && !premium && !canManage;
  const creatorProfile=await profileById(game.developerId,user?.id);
  const license = licenses.find((l) => l.id === game.license);
  const description = pickText(game.description, locale);

  return (
    <div className="container-pm py-8">
      {previewId && (
        <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber">
          {t.game.previewBanner} (v{version?.number})
        </div>
      )}
      {!isLive && !previewId && (
        <div className="mb-4 rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-sm text-muted">{t.game.notLive}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {version && version.runtimeKind==="browser" ? (
            <Player
              gameId={game.id}
              previewVersionId={previewId}
              sandbox={gameSandbox()}
              orientation={game.orientation}
              fullscreenEnabled={game.fullscreenSupported!==false}
              locked={locked}
              locale={locale}
              cover={<Cover title={game.title} path={game.coverPath} category={game.category} />}
              labels={{
                play: t.game.play,
                fullscreen: t.game.fullscreen,
                premiumTitle: t.game.premiumLockTitle,
                premiumText: t.game.premiumLockText,
                premiumCta: t.game.premiumLockCta,
                sandboxNote: t.game.sandboxNote,
                error: t.common.error,
              }}
            />
          ) : (
            <div className="card flex aspect-video items-center justify-center text-muted">{t.game.notLive}</div>
          )}

          {creatorProfile&&<div className="creator-social"><Link className="text-sm text-muted" href={`/${locale}/u/${creatorProfile.handle}`}>{creatorProfile.name} · {num(creatorProfile.followers,locale)} {locale==="en"?"subscribers":locale==="az"?"abunəçi":"abone"}</Link><FollowButton locale={locale} targetId={creatorProfile.id} handle={creatorProfile.handle} viewerId={user?.id} following={creatorProfile.following}/></div>}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="h1">{game.title}</h1>
                {version?.report.legacyFlash && <span className="badge bg-surface-2">Legacy Flash</span>}
                {game.premiumOnly && <span className="badge bg-amber text-ink">★ {t.common.premium}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="badge bg-surface-2">{game.mobileResponsive===true?(locale==="en"?"Mobile ready":locale === "az" ? "Mobilə uyğundur" : "Mobil uyumlu"):game.mobileResponsive===false?(locale==="en"?"Designed for desktop":locale === "az" ? "Kompüter üçün hazırlanıb" : "Bilgisayar için tasarlandı"):(locale==="en"?"Mobile support not specified":locale === "az" ? "Mobil dəstək göstərilməyib" : "Mobil destek belirtilmedi")}</span>{game.fullscreenSupported!==null&&<span className="badge bg-surface-2">{game.fullscreenSupported?(locale==="en"?"Fullscreen":locale === "az" ? "Tam ekran" : "Tam ekran"):(locale==="en"?"Windowed":locale === "az" ? "Pəncərə rejimi" : "Pencere modu")}</span>}</div><p className="mt-1.5 text-muted">{pickText(game.tagline, locale)}</p>{version?.report.legacyFlash && <p className="mt-2 text-xs text-muted">{locale === "en" ? "Legacy game. Original game rights belong to their respective owners." : locale === "az" ? "Köhnə oyun. Oyunun hüquqları müvafiq sahiblərinə məxsusdur." : "Eski oyun. Oyunun hakları ilgili sahiplerine aittir."}</p>}
              {dev && (
                <p className="mt-2 text-sm text-faint">
                  {t.common.by}{" "}
                  <Link href={`/${locale}/u/${dev.handle}`} className="font-semibold text-paper hover:text-mint">
                    {dev.displayName}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <LikeButton
                gameId={game.id}
                initialLiked={likedRow.length > 0}
                initialCount={displayLikes}
                loggedIn={!!user}
                locale={locale}
                slug={game.slug}
                labels={{ like: t.game.like, liked: t.game.liked, loginToLike: t.game.loginToLike }}
              />
            </div>
          </div>

          {description && (
            <section className="mt-8">
              <h2 className="h2 text-lg">{t.game.about}</h2>
              <div className="mt-3 whitespace-pre-line leading-relaxed text-muted">{description}</div>
            </section>
          )}
          {game.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <Link key={tag} href={`/${locale}/games?q=${encodeURIComponent(tag)}`} className="badge bg-surface-3 py-1 text-muted hover:text-paper">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">{locale==="en"?"Play more games":locale==="az"?"Daha çox oyun oyna":"Daha fazla oyun oyna"}</h2><Link className="text-xs font-semibold text-mint" href={`/${locale}/games`}>{t.common.seeAll} →</Link></div>
          {recommended.length?<div className="grid grid-cols-2 gap-3">{recommended.map(g=><Link key={g.id} href={`/${locale}/g/${g.slug}`} className="group space-y-2"><div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2"><Cover title={g.title} path={g.coverPath} category={g.category} className="transition group-hover:scale-105"/></div><h3 className="line-clamp-2 text-sm font-semibold">{g.title}</h3><p className="text-xs text-muted">{num(g.playCount,locale)} {t.common.plays}</p></Link>)}</div>:<p className="rounded-2xl border border-line p-5 text-sm text-muted">{locale==="en"?"Other approved games will appear here as they are published.":locale==="az"?"Yeni təsdiqlənmiş oyunlar yayımlandıqca burada görünəcək.":"Yeni onaylı oyunlar yayınlandıkça burada görünecek."}</p>}
          </section>
          {game.subscriptionPriceCents>0 && <section id="subscription" className="card p-5 scroll-mt-24">
            <p className="eyebrow">{locale==="en"?"GAME SUBSCRIPTION":locale==="az"?"OYUN ABUNƏLİYİ":"OYUN ABONELİĞİ"}</p>
            <h2 className="mt-2 font-display text-xl font-bold">{game.title}</h2>
            <p className="mt-4 text-3xl font-bold">{money(game.subscriptionPriceCents,game.subscriptionCurrency,locale)}<span className="text-sm text-muted"> / {locale==="en"?"month":locale === "az" ? "ay" : "ay"}</span></p>
            <p className="mt-3 whitespace-pre-line text-sm text-muted">{game.subscriptionBenefits}</p>
            <p className="mt-3 text-xs text-muted">{locale==="en"?"Price set by the developer. Valid only for this game.":locale==="az"?"Qiyməti geliştirici təyin edir. Yalnız bu oyun üçün keçərlidir.":"Fiyatı geliştirici belirler. Yalnızca bu oyunda geçerlidir."}</p>
            {subscription ? <form action={gameSubscriptionAction} className="mt-4"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="gameId" value={game.id}/><p className="text-mint text-sm">{date(subscription.currentPeriodEnd,locale)} · {subscription.provider==="mock"?t.common.testMode:t.common.status}</p><button name="op" value="cancel" disabled={subscription.cancelAtPeriodEnd} className="btn btn-ghost btn-sm mt-3">{subscription.cancelAtPeriodEnd?(locale==="en"?"Ends at period end":locale === "az" ? "Dövrün sonunda bitəcək" : "Dönem sonunda bitecek"):t.common.cancel}</button></form> : <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-amber">{locale==="en"?"Payments are not enabled yet.":locale==="az"?"Ödənişlər hələ aktiv deyil.":"Ödemeler henüz etkin değil."}</p>}
            {canManage&&!subscription&&<form action={gameSubscriptionAction} className="mt-3"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="gameId" value={game.id}/><button name="op" value="test" className="btn btn-ghost btn-sm">{locale==="en"?"Test plan (no charge)":locale === "az" ? "Planı test et (pul alınmır)" : "Planı test et (para çekilmez)"}</button></form>}
          </section>}

          <div className="card divide-y divide-line">
            {(starter.plays>0||starter.likes>0)&&<p className="col-span-full text-xs text-muted">{locale==="en"?"Includes editorial starter counts.":locale==="az"?"Başlanğıc göstəriciləri daxildir.":"Başlangıç sayaçlarını içerir."}</p>}
            <Stat label={t.common.plays} value={num(displayPlays, locale)} />
            <Stat label={t.common.likes} value={num(displayLikes, locale)} />
            <Stat label={t.game.playtime} value={`${hours(game.playSeconds, locale)} ${t.common.hours}`} />
            {isCategory(game.category) && (
              <Stat
                label="#"
                value={
                  <Link href={`/${locale}/games?category=${game.category}`} className="hover:text-mint">
                    <span className="inline-flex items-center gap-2"><CategoryIcon category={game.category}/>{t.categories[game.category]}</span>
                  </Link>
                }
              />
            )}
            {version && <Stat label={t.game.version} value={`v${version.number}`} />}
            <Stat label={t.game.updated} value={date(game.updatedAt, locale)} />
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="badge bg-mint/15 text-mint">{"</>"} {game.license==="Developer"?(locale==="en"?"Creator game":locale==="az"?"Geliştirici oyunu":"Geliştirici oyunu"):t.game.openSource}</span>
              <a href={license?.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-mint">
                {t.game.license}: {game.license}
              </a>
            </div>
            {version?.report.openSource && /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/tree\/[a-f0-9]{40}(?:\/[a-zA-Z0-9_.\/-]+)?$/.test(version.report.openSource.source) && <div className="mt-4 border-t border-line pt-4 text-sm"><p className="text-muted">{locale==="en"?"Original developer":locale==="az"?"Orijinal müəllif":"Orijinal geliştirici"}: <strong className="text-paper">{version.report.openSource.author}</strong></p><a href={version.report.openSource.source} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-3 w-full">{t.game.sourceCode} <span aria-hidden="true">↗</span></a><a href={`/play/${version.id}/${(version.report.openSource.licensePath||"LICENSE").split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-mint">{locale==="en"?"License and copyright notice":locale==="az"?"Lisenziya və müəllif hüquqları":"Lisans ve telif bildirimi"}</a></div>}
            {version && !version.report.sourceRemovedAt && ((game.license!=="Developer"&&!version.report.project?.sourceProject) || canManage) && (
              <a href={`/api/source/${version.id}`} className="btn btn-ghost mt-4 w-full">
                ⬇ {t.game.sourceCode}
              </a>
            )}
          </div>
        </aside>
      </div>

      {more.length > 0 && dev && (
        <section className="mt-14">
          <h2 className="h2 mb-4">{fill(t.game.moreFrom, { name: dev.displayName })}</h2>
          <GameGrid games={more} locale={locale} t={t} />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
