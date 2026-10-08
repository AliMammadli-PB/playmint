import Link from "next/link";
import {resolveLocale} from "@/lib/i18n";
import {listGames} from "@/lib/games";
import {GameGrid,Cover,GameCardDetails} from "@/components/GameCard";
import {CatalogShell,CatalogEmpty} from "@/components/CatalogShell";
export const dynamic="force-dynamic";
export default async function Home({params}:PageProps<"/[locale]">){
 const {locale,t}=await resolveLocale(params);
 const [popular,featured]=await Promise.all([listGames({limit:60}),listGames({featured:true,limit:6})]);
 const spotlight=featured[0]??popular[0];
 const seen=new Set<string>(spotlight?[spotlight.id]:[]);
 const opening=[...featured,...popular].filter(g=>{if(seen.has(g.id))return false;seen.add(g.id);return true;}).slice(0,4);
 const openingIds=new Set(opening.map(g=>g.id));
 const remaining=popular.filter(g=>g.id!==spotlight?.id&&!openingIds.has(g.id));
 return <CatalogShell locale={locale} active="home" categoryLabels={t.categories}>
 <div className="portal-heading"><h1>{t.nav.games}</h1><Link href={`/${locale}/games`}>{t.common.seeAll} <span aria-hidden="true">→</span></Link></div>
 <div className="portal-opening">
 {spotlight?<Link href={`/${locale}/g/${spotlight.slug}`} className="game-tile portal-spotlight"><div className="game-cover"><Cover title={spotlight.title} path={spotlight.coverPath} category={spotlight.category}/></div><div className="spotlight-copy"><h2>{spotlight.title}</h2><GameCardDetails game={spotlight} locale={locale}/><span className="spotlight-action">{t.game.play} <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg></span></div></Link>:<CatalogEmpty locale={locale}/>}
 {opening.length>0&&<div className="portal-opening-games"><GameGrid games={opening} locale={locale} t={t}/></div>}
 </div>
 {remaining.length>0&&<section className="home-shelf" aria-label={t.nav.games}><GameGrid games={remaining} locale={locale} t={t}/></section>}
 </CatalogShell>;
}
