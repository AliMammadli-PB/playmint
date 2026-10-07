import 'server-only';
import {and,eq,sql} from 'drizzle-orm';
import {db,schema} from '@/lib/db';
import {newId} from '@/lib/ids';
import {MIN_WITHDRAWAL,validTrIban,splitSettlement} from '@/lib/bank-money';
export async function adBalance(developerId:string,query:Pick<typeof db,"select">=db){
 const [row]=(await query.select({n:sql<number>`coalesce(sum(${schema.adAllocations.developerCents}),0)::bigint`}).from(schema.adAllocations).innerJoin(schema.adSettlements,eq(schema.adSettlements.id,schema.adAllocations.settlementId)).where(and(eq(schema.adAllocations.developerId,developerId),eq(schema.adSettlements.status,'confirmed'))));
 const outs=await query.select().from(schema.payouts).where(and(eq(schema.payouts.developerId,developerId),eq(schema.payouts.currency,'TRY')));
 const paid=outs.filter(p=>p.status==='paid').reduce((a,p)=>a+p.amountCents,0),requested=outs.filter(p=>p.status==='requested').reduce((a,p)=>a+p.amountCents,0),lifetime=Number(row.n);
 return {currency:'TRY',lifetimeCents:lifetime,pendingCents:0,availableCents:Math.max(0,lifetime-paid-requested),paidCents:paid,requestedCents:requested,minPayoutCents:MIN_WITHDRAWAL};
}
export async function requestBankPayout(developerId:string){return db.transaction(async tx=>{
 await tx.select().from(schema.users).where(eq(schema.users.id,developerId)).for('update');
 const profile=(await tx.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.userId,developerId)))[0];if(!profile||profile.payoutMethod!=='iban'||!profile.payoutName||!validTrIban(profile.payoutDetails))throw new Error('iban_required');
 const balance=await adBalance(developerId,tx);if(balance.availableCents<MIN_WITHDRAWAL)throw new Error('below_minimum');
 const id=newId();await tx.insert(schema.payouts).values({id,developerId,amountCents:balance.availableCents,currency:'TRY',method:'iban',details:JSON.stringify({name:profile.payoutName,iban:profile.payoutDetails})});return id;
});}
export async function confirmSettlement(id:string,adminId:string){return db.transaction(async tx=>{
 const settlement=(await tx.select().from(schema.adSettlements).where(eq(schema.adSettlements.id,id)).for('update'))[0];if(!settlement)throw new Error('not_found');if(settlement.status==='confirmed')return;
 const allocations=await tx.select().from(schema.adAllocations).where(eq(schema.adAllocations.settlementId,id));
 const expected=splitSettlement(settlement.netTryCents,allocations);if(!expected.length||expected.some(r=>{const a=allocations.find(a=>a.gameId===r.gameId)!;return a.developerCents!==r.developerCents||a.platformCents!==r.platformCents;}))throw new Error('invalid_distribution');
 await tx.update(schema.adSettlements).set({status:'confirmed',confirmedBy:adminId,confirmedAt:new Date()}).where(eq(schema.adSettlements.id,id));
});}
