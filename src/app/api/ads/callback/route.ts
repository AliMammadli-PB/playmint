import {and,eq} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {verifyAdSignature} from "@/lib/ad-verification";
import {splitAdRevenue} from "@/lib/monetization";
import {z} from "zod";
const payload=z.object({requestId:z.string().min(1).max(80),eventId:z.string().min(1).max(200),completed:z.literal(true),netCents:z.number().int().min(0).max(1000000),currency:z.string().regex(/^[A-Z]{3}$/)});
export async function POST(req:Request) {
 const secret=process.env.AD_WEBHOOK_SECRET;
 if(!secret)return Response.json({error:"unconfigured"},{status:503});
 if(Number(req.headers.get("content-length")??0)>16384)return new Response(null,{status:413});
 const raw=await req.text();if(raw.length>16384)return new Response(null,{status:413});
 if(!verifyAdSignature(raw,req.headers.get("x-ad-timestamp")??"",req.headers.get("x-ad-signature")??"",secret))return new Response(null,{status:401});
 let body:unknown;try{body=JSON.parse(raw);}catch{return new Response(null,{status:400});}
 const parsed=payload.safeParse(body);if(!parsed.success)return new Response(null,{status:400});
 const p=parsed.data;
 try{
  const status=await db.transaction(async tx=>{
   const event=(await tx.select().from(schema.adEvents).where(eq(schema.adEvents.id,p.requestId)).for("update"))[0];
   if(!event||event.currency!==p.currency)return 404;
   if(event.status==="verified")return event.providerEventId===p.eventId?200:409;
   if(event.status!=="pending"||Date.now()-event.createdAt.getTime()>15*60000)return 409;
   const split=splitAdRevenue(p.netCents);
   await tx.update(schema.adEvents).set({status:"verified",providerEventId:p.eventId,netCents:p.netCents,...split,verifiedAt:new Date()}).where(and(eq(schema.adEvents.id,event.id),eq(schema.adEvents.status,"pending")));
   return 200;
  });
  return Response.json({ok:status===200},{status});
 }catch{return Response.json({error:"duplicate_or_failed"},{status:409});}
}
