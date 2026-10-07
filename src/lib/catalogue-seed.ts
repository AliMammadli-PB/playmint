import 'server-only';
import {sql} from 'drizzle-orm';
import {db,schema} from './db';
/** Editorial starter counters are separate from verified plays, likes, analytics and revenue. */
export function starterCounter(gameId: typeof schema.games.id, field:'plays'|'likes') {
 return sql<number>`coalesce((select least(100000, greatest(0, (s.value->>${field})::int)) from settings s where s.key = 'catalogueSeed:' || ${gameId}),0)`;
}
export async function getStarterCounters(gameId:string){const [row]=await db.select({value:schema.settings.value}).from(schema.settings).where(sql`${schema.settings.key}=${'catalogueSeed:'+gameId}`);const v=row?.value as {plays?:number;likes?:number}|undefined;return {plays:v?.plays||0,likes:v?.likes||0};}
