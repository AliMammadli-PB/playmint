import {categories} from "@/lib/catalog";
import {CategoryIcon} from "./CategoryIcon";
import {StudioIcon} from "./Studio";
import Link from "next/link";
import type {Locale} from "@/lib/i18n/config";
export function CatalogShell({locale,active,children,categoryLabels}:{locale:Locale;active:"home"|"browse";children:React.ReactNode;categoryLabels?:Record<string,string>}){
 const en=locale==="en",az=locale==="az";
 const labels={home:en?"Home":az?"Ana səhifə":"Ana sayfa",browse:en?"Browse":az?"Kəşf et":"Keşfet",library:en?"Your games":az?"Oyunların":"Oyunların",upload:en?"Upload a game":az?"Oyununu yüklə":"Oyununu yükle"};
 return <div className="catalog-shell"><aside className="catalog-side" aria-label={labels.browse}><Link className={active==="home"?"selected":""} href={`/${locale}`}><StudioIcon name="home"/>{labels.home}</Link><Link className={active==="browse"?"selected":""} href={`/${locale}/games`}><StudioIcon name="compass"/>{labels.browse}</Link><Link href={`/${locale}/people`}><StudioIcon name="users"/>{en?"Community":az?"İcma":"Topluluk"}</Link><Link href={`/${locale}/me`}><StudioIcon name="users"/>{labels.library}</Link><div className="catalog-divider"/>{categoryLabels&&<nav className="catalog-categories" aria-label={en?"Categories":az?"Kateqoriyalar":"Kategoriler"}>{categories.map(c=><Link key={c} href={`/${locale}/games?category=${c}`}><CategoryIcon category={c}/>{categoryLabels[c]}</Link>)}</nav>}<div className="catalog-divider"/><Link href={`/${locale}/developers`}><StudioIcon name="upload"/>{labels.upload}</Link></aside><div className="min-w-0">{children}</div></div>;
}
export function CatalogTabs({locale,active}:{locale:Locale;active:"home"|"browse"}){return <nav className="catalog-tabs"><Link className={active==="home"?"selected":""} href={`/${locale}`}>{locale==="en"?"Home":locale==="az"?"Ana səhifə":"Ana sayfa"}</Link><Link className={active==="browse"?"selected":""} href={`/${locale}/games`}>{locale==="en"?"Browse all":locale==="az"?"Bütün oyunlar":"Tüm oyunlar"}</Link></nav>;}
export function CatalogEmpty({locale}:{locale:Locale}){
 const en=locale==="en",az=locale==="az";
 return <div className="catalog-empty"><div className="mb-5 rounded-3xl bg-[#e6f4ed] p-5 text-mint"><StudioIcon name="game" className="h-12 w-12"/></div><h2 className="font-display text-xl font-bold">{en?"The first games are on their way":az?"İlk oyunlar yoldadır":"İlk oyunlar yolda"}</h2><p className="mt-3 max-w-md text-sm text-muted">{en?"No games have been published yet. Discover new games here as they arrive.":az?"Hələ yayımlanmış oyun yoxdur. Yeni oyunları burada kəşf edə biləcəksən.":"Henüz yayınlanmış oyun yok. Yeni oyunlar eklendiğinde burada keşfedebilirsin."}</p><Link href={`/${locale}/developers`} className="btn btn-primary mt-6">{en?"Upload your game":az?"Oyununu yüklə":"Oyununu yükle"}</Link></div>;
}
