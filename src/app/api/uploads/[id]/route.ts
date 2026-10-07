import {crossOrigin} from "@/lib/origin";
import {after} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getUpload,UploadError,processAlive,cancelUpload} from "@/lib/upload-store";
import {processUpload} from "@/lib/upload-jobs";
export const maxDuration=600;
export async function GET(_req:Request,ctx:RouteContext<"/api/uploads/[id]">){const user=await getCurrentUser();if(!user)return Response.json({error:"forbidden"},{status:403});const {id}=await ctx.params;try{const r=await getUpload(id,user.id);if(r.status==='queued'||(r.status==='processing'&&!processAlive(r.pid)))after(()=>processUpload(id,user.id));return Response.json({status:r.status,next:r.next,received:r.received,total:r.total,gameId:r.job?.gameId,versionId:r.versionId,error:r.error},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return Response.json({error:e instanceof UploadError?e.code:"error"},{status:e instanceof UploadError?e.status:500});}}

export async function DELETE(req:Request,ctx:RouteContext<"/api/uploads/[id]">){if(crossOrigin(req))return Response.json({error:'forbidden'},{status:403});const user=await getCurrentUser();if(!user)return Response.json({error:'forbidden'},{status:403});const {id}=await ctx.params;try{await cancelUpload(id,user.id);return Response.json({ok:true});}catch(e){return Response.json({error:e instanceof UploadError?e.code:'error'},{status:e instanceof UploadError?e.status:500});}}
