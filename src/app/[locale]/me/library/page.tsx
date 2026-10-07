import {resolveLocale} from "@/lib/i18n";
import {requireUser} from "@/lib/auth";
import {playerLibrary} from "@/lib/player-data";
import {GameGrid} from "@/components/GameCard";
import {StudioHeading,StudioEmpty} from "@/components/Studio";
export default async function Library({params}:PageProps<"/[locale]/me/library">){const {locale,t}=await resolveLocale(params);const user=await requireUser(locale),en=locale==="en",az=locale==="az",[liked,recent]=await playerLibrary(user.id);return <div className="space-y-8"><StudioHeading eyebrow="SAVED FOR ANOTHER ROUND" title={en?"My library":az?"Kitabxanam":"Kütüphanem"} accent="blue"/><section><h2 className="h2 mb-5">{t.me.liked}</h2>{liked.length?<GameGrid games={liked} locale={locale} t={t}/>:<StudioEmpty title={t.me.liked} text={t.me.emptyLiked}/>}</section><section><h2 className="h2 mb-5">{t.me.recent}</h2>{recent.length?<GameGrid games={recent} locale={locale} t={t}/>:<StudioEmpty title={t.me.recent} text={t.me.emptyRecent}/>}</section></div>;}
