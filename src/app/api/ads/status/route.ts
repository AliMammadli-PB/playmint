import {and,eq} from "drizzle-orm";
import {crossOrigin} from "@/lib/origin";
import {rewardSession} from "@/lib/ad-session";
import {db,schema} from "@/lib/db";
import {rateLimit} from "@/lib/rate-limit";
export async function POST(req:Request) {
 if(crossOrigin(req))return Response.json({error:"forbidden"},{status:403});
 const body=await req.json().catch(()=>null);const session=await rewardSession(body?.token);
 if(!session||typeof body?.requestId!=="string")return Response.json({error:"forbidden"},{status:403});
 if(!rateLimit(`adstatus:${session.id}`,120,60000))return Response.json({error:"rate_limited"},{status:429});
 const event=(await db.select().from(schema.adEvents).where(and(eq(schema.adEvents.id,body.requestId),eq(schema.adEvents.playSessionId,session.id))))[0];
 if(!event)return Response.json({error:"not_found"},{status:404});
 return Response.json({completed:event.status==="verified",status:event.status});
}
