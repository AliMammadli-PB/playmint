import {after} from 'next/server';
import {eq} from 'drizzle-orm';
import {getCurrentUser} from '@/lib/auth';
import {db,schema} from '@/lib/db';
import {scanVersion} from '@/lib/virustotal';
import {crossOrigin} from '@/lib/origin';
export const maxDuration=600;
export async function GET(_req:Request,ctx:RouteContext<'/api/review/scan/[versionId]'>){
 const user=await getCurrentUser();if(!user||user.role!=='admin')return Response.json({error:'forbidden'},{status:403});
 const {versionId}=await ctx.params;const v=(await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id,versionId)))[0];if(!v)return Response.json({error:'not_found'},{status:404});
 return Response.json({scan:v.report.virustotal??null,status:v.status},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(req:Request,ctx:RouteContext<'/api/review/scan/[versionId]'>){
 if(crossOrigin(req))return Response.json({error:'forbidden'},{status:403});const user=await getCurrentUser();if(!user||user.role!=='admin')return Response.json({error:'forbidden'},{status:403});const {versionId}=await ctx.params;
 after(()=>scanVersion(versionId));return Response.json({ok:true},{status:202});
}
