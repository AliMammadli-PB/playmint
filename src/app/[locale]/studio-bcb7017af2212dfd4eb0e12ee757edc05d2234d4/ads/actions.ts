'use server';
import {and,eq,sql} from 'drizzle-orm';
import {db,schema} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {newId} from '@/lib/ids';
import {moneyMinor,splitSettlement} from '@/lib/bank-money';
import {confirmSettlement} from '@/lib/ad-ledger';
import {audit} from '@/lib/audit';
import {isLocale} from '@/lib/i18n/config';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
const base='/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/ads';
export async function adAdminAction(form:FormData){const user=await getCurrentUser();if(!user||user.role!=='admin')return;const locale=isLocale(form.get('locale'))?String(form.get('locale')):'tr';const op=String(form.get('op'));let error='';try{
 if(op==='channel'){const gameId=String(form.get('gameId')),channel=String(form.get('channelId')??'').trim();if(!/^\d{1,30}$/.test(channel))throw new Error('invalid_channel');const game=(await db.select().from(schema.games).where(eq(schema.games.id,gameId)))[0];if(!game||game.isDemo)throw new Error('invalid_game');await db.insert(schema.gameAdSettings).values({gameId,channelId:channel}).onConflictDoUpdate({target:schema.gameAdSettings.gameId,set:{channelId:channel}});await audit(user.id,'ads.channel',gameId,{channel});}
 else if(op==='draft'){
  const period=String(form.get('period')),bankReference=String(form.get('bankReference')??'').trim(),raw=String(form.get('reportCsv')??'').trim(),currency=String(form.get('reportCurrency'));
  const receivedDate=new Date(String(form.get('bankReceivedAt'))+'T12:00:00+03:00');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||period>=new Date().toISOString().slice(0,7)||bankReference.length<4||bankReference.length>200||!['TRY','USD','EUR'].includes(currency)||raw.length>200000||Number.isNaN(receivedDate.getTime())||receivedDate>new Date()||form.get('bankReceived')!=='on')throw new Error('invalid_payment_or_report');
  const lines=raw.split(/\r?\n/).filter(Boolean);if(lines.shift()!=='channel_id,amount'||!lines.length)throw new Error('report_header_required');
  const configs=await db.select({c:schema.gameAdSettings,g:schema.games}).from(schema.gameAdSettings).innerJoin(schema.games,eq(schema.games.id,schema.gameAdSettings.gameId));
  const rows:{gameId:string;developerId:string;reportedMinor:number}[]=[];const seen=new Set<string>();for(const line of lines){const fields=line.split(',');if(fields.length!==2||!/^\d+$/.test(fields[0]))throw new Error('invalid_report_row');const match=configs.find(r=>r.c.channelId===fields[0]);if(!match||match.g.isDemo||seen.has(match.g.id))throw new Error('unknown_or_duplicate_channel');const reportedMinor=moneyMinor(fields[1]);if(reportedMinor<=0)throw new Error('invalid_report_amount');seen.add(match.g.id);rows.push({gameId:match.g.id,developerId:match.g.developerId,reportedMinor});}
  const net=moneyMinor(String(form.get('netTry'))),distributed=splitSettlement(net,rows),id=newId();await db.transaction(async tx=>{await tx.insert(schema.adSettlements).values({id,period,bankReference,netTryCents:net,reportCurrency:currency,reportCsv:raw,bankReceivedAt:receivedDate,createdBy:user.id});await tx.insert(schema.adAllocations).values(distributed.map(r=>({settlementId:id,...r,developerId:rows.find(x=>x.gameId===r.gameId)!.developerId})));});await audit(user.id,'ads.payment.draft',id,{bankReference,netTryCents:net});
 }else if(op==='confirm'){const id=String(form.get('settlementId'));await confirmSettlement(id,user.id);await audit(user.id,'ads.payment.confirmed',id);}
 else throw new Error('invalid_action');
}catch(e){error=e instanceof Error&&/^(invalid_|unknown_|report_|not_found)/.test(e.message)?e.message:'operation_failed_or_duplicate';}
 revalidatePath(`/${locale}${base}`);revalidatePath(`/${locale}/dev`,'layout');redirect(`/${locale}${base}${error?'?error='+encodeURIComponent(error):'?saved=1'}`);
}
