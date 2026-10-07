import {eq} from "drizzle-orm";
import {crossOrigin} from "@/lib/origin";
import {rewardSession} from "@/lib/ad-session";
import {db,schema} from "@/lib/db";
import {getSettings} from "@/lib/settings";
import {rateLimit} from "@/lib/rate-limit";
import {newId} from "@/lib/ids";
import {env} from "@/lib/env";
/** Generic HTTPS provider adapter. Remains unavailable until configured with a real provider. */
export async function POST(req:Request) {
 if(crossOrigin(req))return Response.json({error:"forbidden"},{status:403});
 const body=await req.json().catch(()=>null);const session=await rewardSession(body?.token);
 if(!session)return Response.json({error:"invalid_session"},{status:403});
 if(!rateLimit(`reward:${session.visitorId}`,4,60000))return Response.json({error:"rate_limited"},{status:429});
 const placement=body?.placement;
 if(typeof placement!=="string"||! /^[a-z0-9_-]{1,40}$/.test(placement))return Response.json({error:"invalid_placement"},{status:400});
 const game=(await db.select().from(schema.games).where(eq(schema.games.id,session.gameId)))[0];
 if(!game?.rewardedAds||game.status!=="published")return Response.json({error:"ads_disabled"},{status:409});
 const endpoint=process.env.AD_PROVIDER_URL,apiKey=process.env.AD_PROVIDER_KEY,secret=process.env.AD_WEBHOOK_SECRET;
 if(!endpoint||!apiKey||!secret||!endpoint.startsWith("https://"))return Response.json({error:"ads_unavailable"},{status:503});
 const id=newId();const settings=await getSettings();
 await db.insert(schema.adEvents).values({id,gameId:game.id,playSessionId:session.id,placement,currency:settings.currency});
 try{
  const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},body:JSON.stringify({requestId:id,gameId:game.id,placement,currency:settings.currency,callbackUrl:`${env.siteUrl}/api/ads/callback`}),signal:AbortSignal.timeout(10000),redirect:"error"});
  const result=await res.json(); const url=new URL(result.url);
  const origins=(process.env.AD_ALLOWED_ORIGINS??"").split(",");
  if(!res.ok||url.protocol!=="https:"||!origins.includes(url.origin))throw new Error("invalid_provider_url");
  return Response.json({requestId:id,url:url.href});
 }catch{
  await db.update(schema.adEvents).set({status:"failed"}).where(eq(schema.adEvents.id,id));
  return Response.json({error:"ads_unavailable"},{status:503});
 }
}
