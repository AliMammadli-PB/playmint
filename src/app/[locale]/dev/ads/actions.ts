'use server';
import {eq,and} from 'drizzle-orm';
import {db,schema} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {isLocale} from '@/lib/i18n/config';
export async function saveAds(form:FormData){const user=await getCurrentUser();if(!user)return;const gameId=String(form.get('gameId'));const game=(await db.select().from(schema.games).where(and(eq(schema.games.id,gameId),eq(schema.games.developerId,user.id))))[0];if(!game)return;const raw=Number(form.get('intervalSeconds'));const values={enabled:form.get('enabled')==='on',startup:form.get('startup')==='on',midgame:form.get('midgame')==='on',rewarded:form.get('rewarded')==='on',intervalSeconds:[180,300,600].includes(raw)?raw:300,updatedAt:new Date()};await db.insert(schema.gameAdSettings).values({gameId,...values}).onConflictDoUpdate({target:schema.gameAdSettings.gameId,set:values});const locale=isLocale(form.get('locale'))?String(form.get('locale')):'tr';revalidatePath(`/${locale}/dev/ads`);redirect(`/${locale}/dev/ads?saved=1`);}
