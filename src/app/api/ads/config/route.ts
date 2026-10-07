import {db,schema} from '@/lib/db';
import {eq} from 'drizzle-orm';
import {getAdConfig} from '@/lib/ad-config';
export async function GET(req:Request){const gameId=new URL(req.url).searchParams.get('gameId')??'';const game=(await db.select().from(schema.games).where(eq(schema.games.id,gameId)))[0];if(!game||game.isDemo||game.status!=='published'||!game.liveVersionId)return Response.json({enabled:false},{headers:{'Cache-Control':'no-store'}});return Response.json(await getAdConfig(gameId),{headers:{'Cache-Control':'no-store'}});}
