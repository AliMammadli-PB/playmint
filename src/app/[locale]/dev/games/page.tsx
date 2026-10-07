import {StudioHeading,StudioIcon,StudioEmpty} from "@/components/Studio";
import Link from "next/link";
import { and, ne, desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { num } from "@/lib/format";
import { StatusBadge } from "@/components/Kpi";
import { Cover } from "@/components/GameCard";
import { gameTone, versionTone } from "@/lib/tones";


export default async function DevGames({ params }: PageProps<"/[locale]/dev/games">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireDeveloper(locale);
  const games = await db.select().from(schema.games).where(and(eq(schema.games.developerId, user.id),eq(schema.games.isDemo,false),ne(schema.games.status,"removed"))).orderBy(desc(schema.games.createdAt));
  const versions = await db
    .select({ gameId: schema.gameVersions.gameId, number: schema.gameVersions.number, status: schema.gameVersions.status })
    .from(schema.gameVersions)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
    .where(eq(schema.games.developerId, user.id))
    .orderBy(desc(schema.gameVersions.number));
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) if (!latest.has(v.gameId)) latest.set(v.gameId, v);

  const en=locale==="en",az=locale==="az";
  return <div className="space-y-7"><StudioHeading eyebrow="YOUR GAME LIBRARY" title={t.dev.gamesTitle} description={en?"Manage every game, every version and every release.":az?"Oyunlarını, versiyalarını və yayımlarını idarə et.":"Oyunlarını, sürümlerini ve yayınlarını tek yerden yönet."} action={<Link href={`/${locale}/dev/games/new`} className="btn btn-primary"><StudioIcon name="upload"/>{t.dev.nav.newGame}</Link>}/>{games.filter(g=>!g.isDemo).length?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{games.filter(g=>!g.isDemo).map(g=>{const v=latest.get(g.id);return <article key={g.id} className="overflow-hidden rounded-2xl border border-line bg-white hover:shadow-xl hover:shadow-mint/5 transition"><div className="aspect-video bg-surface-2"><Cover title={g.title} path={g.coverPath} category={g.category}/></div><div className="p-5"><h2 className="font-bold text-lg truncate"><Link href={`/${locale}/dev/games/${g.id}`}>{g.title}</Link></h2><div className="flex flex-wrap gap-2 my-3"><StatusBadge tone={gameTone[g.status]}>{t.dev.gameStatus[g.status]}</StatusBadge>{v&&<StatusBadge tone={versionTone[v.status]}>{t.dev.versionStatus[v.status]}</StatusBadge>}</div><div className="flex justify-between border-t border-line pt-4 text-xs text-muted"><span>{num(g.playCount,locale)} {t.common.plays}</span><Link href={`/${locale}/dev/games/${g.id}#edit`} className="btn btn-primary btn-sm">{en?"Edit":az?"Düzəliş et":"Düzenle"} ↗</Link></div></div></article>;})}</div>:<StudioEmpty title={en?"Make room for your first game":az?"İlk oyununa yer aç":"İlk oyununa yer aç"} text={en?"Upload a game to start building your library.":az?"Oyun kitabxananı yaratmaq üçün oyun yüklə.":"Oyun kütüphaneni oluşturmak için ilk oyununu yükle."} href={`/${locale}/dev/games/new`} cta={t.dev.nav.newGame}/>}</div>;
}
