import "server-only";
import {cookies} from "next/headers";
import {eq} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {verifyToken} from "@/lib/play";
import {getCurrentUser} from "@/lib/auth";
export async function rewardSession(token:unknown) {
 if(typeof token!=="string"||token.length>200)return null;
 const id=verifyToken(token);if(!id)return null;
 const session=(await db.select().from(schema.playSessions).where(eq(schema.playSessions.id,id)))[0];
 if(!session||session.startedAt.getTime()<Date.now()-6*3600_000)return null;
 const user=await getCurrentUser(); const visitor=(await cookies()).get("pm_vid")?.value;
 if(session.userId ? user?.id!==session.userId : visitor!==session.visitorId)return null;
 return session;
}
