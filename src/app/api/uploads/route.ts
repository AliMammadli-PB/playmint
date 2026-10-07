import {crossOrigin} from "@/lib/origin";
import {getCurrentUser} from "@/lib/auth";
import {getSettings} from "@/lib/settings";
import {beginUpload,CHUNK_BYTES,UploadError} from "@/lib/upload-store";
import {rateLimit} from "@/lib/rate-limit";
export async function POST(req:Request){if(crossOrigin(req))return Response.json({error:"forbidden"},{status:403});const user=await getCurrentUser();if(!user||(user.role!=="developer"&&user.role!=="admin"))return Response.json({error:"forbidden"},{status:403});if(!rateLimit(`upload-init:${user.id}`,20,3600000))return Response.json({error:"rate_limited"},{status:429});const body=await req.json().catch(()=>null);if(!body||typeof body.filename!=="string")return Response.json({error:"zip_invalid"},{status:400});try{const settings=await getSettings();const r=await beginUpload(user.id,body.filename,body.size,settings.maxZipMb*1024*1024);return Response.json({id:r.id,chunkSize:CHUNK_BYTES,next:r.next});}catch(e){return Response.json({error:e instanceof UploadError?e.code:"error"},{status:e instanceof UploadError?e.status:500});}}
