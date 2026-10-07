import Link from "next/link";
import {resolveLocale} from "@/lib/i18n";
import {listGames,categoryCounts} from "@/lib/games";
import {GameGrid} from "@/components/GameCard";
import {CatalogShell,CatalogEmpty} from "@/components/CatalogShell";
import {CategoryIcon} from "@/components/CategoryIcon";
import {categories} from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function Home({params}:PageProps<"/[locale]">){
 const {locale,t}=await resolveLocale(params),en=locale==="en",az=locale==="az";
 const [trending,featured,newest,counts]=await Promise.all([listGames({sort:"trending",limit:12}),listGames({featured:true,limit:6}),listGames({sort:"new",limit:12}),categoryCounts()]);
 const seen=new Set<string>();
 const shelves=[{title:en?"Featured":az?"Seçilmiş oyunlar":"Öne çıkanlar",games:featured,query:"featured=1"},{title:en?"Play now":az?"İndi oyna":"Şimdi oyna",games:trending,query:"sort=trending"},{title:en?"New arrivals":az?"Yeni oyunlar":"Yeni oyunlar",games:newest,query:"sort=new"}].map(s=>({...s,games:s.games.filter(g=>{if(seen.has(g.id))return false;seen.add(g.id);return true;})}));
 return <CatalogShell locale={locale} active="home"><div className="home-open"><div><h1>{en?"Find your next game":az?"Növbəti oyununu tap":"Sıradaki oyununu bul"}</h1><p>{en?"Independent games. Open your browser and play.":az?"Müstəqil oyunlar. Brauzerində aç və oyna.":"Bağımsız oyunlar. Tarayıcında aç ve oyna."}</p></div><Link href={`/${locale}/games`} className="btn btn-ghost">{t.common.seeAll}</Link></div><nav className="home-chips" aria-label={en?"Browse games":az?"Oyunları kəşf et":"Oyunları keşfet"}>{[{name:en?"Trending":locale === "az" ? "Trend" : "Trend",query:"sort=trending"},{name:en?"New":az?"Yeni":"Yeni",query:"sort=new"},{name:en?"Featured":az?"Seçilmiş":"Öne çıkan",query:"featured=1"}].map(c=><Link key={c.query} href={`/${locale}/games?${c.query}`}>{c.name}</Link>)}{categories.filter(c=>counts[c]>0).map(c=><Link key={c} href={`/${locale}/games?category=${c}`}><CategoryIcon category={c}/>{t.categories[c]} <span className="text-faint">{counts[c]}</span></Link>)}</nav>{seen.size?shelves.filter(s=>s.games.length).map(s=><section className="home-shelf" key={s.query}><div className="section-heading"><h2>{s.title}</h2><Link href={`/${locale}/games?${s.query}`} className="btn btn-ghost btn-sm">{t.common.seeAll}</Link></div><GameGrid games={s.games} locale={locale} t={t}/></section>):<CatalogEmpty locale={locale}/>}</CatalogShell>;
}
