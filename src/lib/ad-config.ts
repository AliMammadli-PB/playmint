import 'server-only';
import {env} from '@/lib/env';
import {eq} from 'drizzle-orm';
import {db,schema} from '@/lib/db';
export const PUBLISHER='ca-pub-7307363660550938';
export function h5Approved(){return process.env.H5_ADS_APPROVED==='true';}
export async function getAdConfig(gameId:string){const config=(await db.select().from(schema.gameAdSettings).where(eq(schema.gameAdSettings.gameId,gameId)))[0];return {publisher:PUBLISHER,enabled:h5Approved()&&!!env.gameOrigin&&!!config?.enabled&&!!config.channelId,startup:config?.startup??true,midgame:config?.midgame??false,rewarded:config?.rewarded??false,intervalSeconds:config?.intervalSeconds??300,channelId:config?.channelId??null,approvalPending:!h5Approved()};}
