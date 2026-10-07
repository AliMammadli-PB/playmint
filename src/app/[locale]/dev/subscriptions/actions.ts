"use server";
import {revalidatePath} from "next/cache";
import {and,eq} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
import {isLocale} from "@/lib/i18n/config";
import {audit} from "@/lib/audit";
export type PlanState={error?:string;ok?:boolean}|null;
export async function savePlan(_previous:PlanState,form:FormData):Promise<PlanState>{const user=await getCurrentUser();const l=form.get("locale"),locale=isLocale(l)?l:"tr",en=locale==="en",az=locale==="az";if(!user||(user.role!=="developer"&&user.role!=="admin"))return {error:"Forbidden"};const id=String(form.get("gameId")??"");const currency=String(form.get("currency")??"USD");const price=Number(form.get("price")),required=form.get("required")==="on",benefits=String(form.get("benefits")??"").trim().slice(0,1000);if(!["USD","TRY"].includes(currency)||!Number.isFinite(price)||price<0||price>10000||(required&&price<=0))return {error:en?"Enter a valid price. A required subscription must have a price.":az?"Etibarlı qiymət daxil et. Məcburi abunəliyin qiyməti olmalıdır.":"Geçerli fiyat gir. Abonelik zorunluysa fiyat sıfırdan büyük olmalı."};const rows=await db.update(schema.games).set({subscriptionPriceCents:Math.round(price*100),subscriptionCurrency:currency,subscriptionBenefits:benefits,premiumOnly:required,updatedAt:new Date()}).where(and(eq(schema.games.id,id),eq(schema.games.developerId,user.id),eq(schema.games.isDemo,false))).returning({slug:schema.games.slug});if(!rows.length)return {error:en?"Game not found.":locale === "az" ? "Oyun tapılmadı." : "Oyun bulunamadı."};await audit(user.id,"game.plan",id,{priceCents:Math.round(price*100),required});revalidatePath(`/${locale}/dev/subscriptions`);revalidatePath(`/${locale}/g/${rows[0].slug}`);return {ok:true};}
