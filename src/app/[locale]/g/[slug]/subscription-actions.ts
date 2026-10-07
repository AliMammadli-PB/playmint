"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { cancelGameSubscription, testGameSubscription } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
export async function gameSubscriptionAction(form:FormData) {
 const l=form.get("locale");const locale=isLocale(l)?l:"tr";
 const user=await requireUser(locale);const id=String(form.get("gameId")??"");
 const game=(await db.select().from(schema.games).where(eq(schema.games.id,id)))[0];
 if(!game) return;
 if(!rateLimit(`subscription:${user.id}`,5,60000)) return;
 if(form.get("op")==="cancel") await cancelGameSubscription(user.id,id);
 if(form.get("op")==="test") await testGameSubscription(user.id,id);
 redirect(`/${locale}/g/${game.slug}`);
}
