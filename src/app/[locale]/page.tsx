import Link from "next/link";
import {resolveLocale} from "@/lib/i18n";
import {listGames,categoryCounts} from "@/lib/games";
import {GameGrid,Cover} from "@/components/GameCard";
import {CatalogShell,CatalogEmpty} from "@/components/CatalogShell";
import {CategoryIcon} from "@/components/CategoryIcon";
import {categories,isCategory} from "@/lib/catalog";
import {pickText} from "@/lib/i18n/text";
export const dynamic="force-dynamic";
export default async function Home({params}:PageProps<"/[locale]">){
 const {locale,t}=await resolveLocale(params),en=locale==="en",az=locale==="az";
 const [trending,featured,newest,counts]=await Promise.all([listGames({sort:"trending",limit:24}),listGames({featured:true,limit:6}),listGames({sort:"new",limit:12}),categoryCounts()]);
 const spotlight=featured[0]??trending[0];
 const seen=new Set<string>(spotlight?[spotlight.id]:[]);
 const shelves=[{title:en?"Featured games":az?"Seçilmiş oyunlar":"Öne çıkan oyunlar",games:featured,query:"featured=1"},{title:en?"Trending games":az?"Trend oyunlar":"Trend oyunlar",games:trending,query:"sort=trending"},{title:en?"New games":az?"Yeni oyunlar":"Yeni oyunlar",games:newest,query:"sort=new"}].map(s=>({...s,games:s.games.filter(g=>{if(seen.has(g.id))return false;seen.add(g.id);return true;})}));
 return <CatalogShell locale={locale} active="home" categoryLabels={t.categories}>
 <div className="portal-heading"><h1>{en?"Let's play":az?"Oynayaq":"Hadi oynayalım"}</h1><Link href={`/${locale}/games`}>{t.common.seeAll} <span aria-hidden="true">→</span></Link></div>
 <div className="portal-opening">
 {spotlight?<Link href={`/${locale}/g/${spotlight.slug}`} className="game-tile portal-spotlight"><div className="game-cover"><Cover title={spotlight.title} path={spotlight.coverPath} category={spotlight.category}/></div><div className="spotlight-copy"><span className="spotlight-kicker">{en?"PLAY NOW":az?"İNDİ OYNA":"ŞİMDİ OYNA"}</span><h2>{spotlight.title}</h2><p>{pickText(spotlight.tagline,locale)!==spotlight.title?pickText(spotlight.tagline,locale):isCategory(spotlight.category)?t.categories[spotlight.category]:spotlight.developerName}</p><span className="spotlight-action">{t.game.play} <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg></span></div></Link>:<CatalogEmpty locale={locale}/>}
 <section className="portal-discovery" aria-label={en?"Discover games":az?"Oyunları kəşf et":"Oyunları keşfet"}><h2>{en?"What do you feel like?":az?"Nə oynamaq istəyirsən?":"Ne oynamak istersin?"}</h2><div className="discovery-grid">{(['puzzle','action','racing','casual','strategy','multiplayer'] as const).map(c=><Link className={`discovery-tile tone-${c}`} key={c} href={`/${locale}/games?category=${c}`}><CategoryIcon category={c}/><strong>{t.categories[c]}</strong><span aria-hidden="true">↗</span></Link>)}</div></section>
 </div>
 <nav className="portal-quicklinks" aria-label={en?"Game collections":az?"Oyun kolleksiyaları":"Oyun koleksiyonları"}>{[{name:en?"Trending":az?"Trend":"Trend",query:"sort=trending"},{name:en?"Recently added":az?"Yeni əlavə olunanlar":"Yeni eklenenler",query:"sort=new"},{name:en?"Most liked":az?"Ən çox bəyənilənlər":"En çok beğenilenler",query:"sort=liked"}].map(c=><Link key={c.query} href={`/${locale}/games?${c.query}`}>{c.name}<span aria-hidden="true">→</span></Link>)}</nav>
 {shelves.filter(s=>s.games.length).map(s=><section className="home-shelf" key={s.query}><div className="section-heading"><h2>{s.title}</h2><Link href={`/${locale}/games?${s.query}`} className="btn btn-ghost btn-sm">{t.common.seeAll}</Link></div><GameGrid games={s.games} locale={locale} t={t}/></section>)}
 <section className="portal-category-section"><div className="section-heading"><h2>{en?"Explore categories":az?"Kateqoriyaları kəşf et":"Kategorileri keşfet"}</h2></div><div className="portal-category-grid">{categories.map(c=><Link href={`/${locale}/games?category=${c}`} key={c}><CategoryIcon category={c}/><strong>{t.categories[c]}</strong><small>{counts[c]??0} {en?"games":az?"oyun":"oyun"}</small></Link>)}</div></section>
 </CatalogShell>;
}
