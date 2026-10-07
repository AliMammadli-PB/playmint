import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
/** Only available to the owner/admin as an explicit test. Production checkout requires a provider. */
export async function testGameSubscription(userId: string, gameId: string) {
 return db.transaction(async tx => {
  const game=(await tx.select().from(schema.games).where(eq(schema.games.id,gameId)).for("update"))[0];
  if(!game || game.subscriptionPriceCents<=0) throw new Error("invalid_plan");
  const user=(await tx.select().from(schema.users).where(eq(schema.users.id,userId)))[0];
  if(!user || (user.id!==game.developerId && user.role!=="admin")) throw new Error("forbidden");
  const existing=(await tx.select().from(schema.subscriptions).where(and(eq(schema.subscriptions.userId,userId),eq(schema.subscriptions.gameId,gameId),eq(schema.subscriptions.status,"active"))))[0];
  if(existing && existing.currentPeriodEnd>new Date()) return existing.id;
  const id=newId();
  await tx.insert(schema.subscriptions).values({id,userId,gameId,provider:"mock",priceCents:game.subscriptionPriceCents,currency:game.subscriptionCurrency,currentPeriodEnd:new Date(Date.now()+30*86400_000)});
  await tx.insert(schema.payments).values({id:newId(),userId,subscriptionId:id,provider:"mock",amountCents:game.subscriptionPriceCents,currency:game.subscriptionCurrency,test:true});
  return id;
 });
}
export async function cancelGameSubscription(userId:string,gameId:string) {
 await db.update(schema.subscriptions).set({cancelAtPeriodEnd:true}).where(and(eq(schema.subscriptions.userId,userId),eq(schema.subscriptions.gameId,gameId),eq(schema.subscriptions.status,"active")));
}
