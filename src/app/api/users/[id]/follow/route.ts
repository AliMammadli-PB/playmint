import {getCurrentUser} from "@/lib/auth";
import {crossOrigin} from "@/lib/origin";
import {rateLimit} from "@/lib/rate-limit";
import {FollowError,setFollow} from "@/lib/community";
import {revalidatePath} from "next/cache";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(crossOrigin(req))return Response.json({error:"forbidden"},{status:403});
 const actor=await getCurrentUser();if(!actor)return Response.json({error:"sign_in_required"},{status:401});
 if(!rateLimit(`follow:${actor.id}`,100,60000))return Response.json({error:"rate_limited"},{status:429});
 const {id}=await params;if(id.length>100)return Response.json({error:"not_found"},{status:404});
 let raw="";const reader=req.body?.getReader();if(!reader)return Response.json({error:"invalid_request"},{status:400});
 try{const decoder=new TextDecoder();let bytes=0;for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();return Response.json({error:"too_large"},{status:413});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
 let body:{following?:unknown};try{body=JSON.parse(raw);}catch{return Response.json({error:"invalid_request"},{status:400});}if(!body||typeof body.following!=="boolean")return Response.json({error:"invalid_request"},{status:400});
 try{const result=await setFollow(actor.id,id,body.following);for(const locale of ["tr","az","en"]){revalidatePath(`/${locale}/u/[handle]`,"page");revalidatePath(`/${locale}/people`);revalidatePath(`/${locale}/me/community`);revalidatePath(`/${locale}/me`);}return Response.json(result,{headers:{"Cache-Control":"no-store"}});}catch(e){if(e instanceof FollowError)return Response.json({error:e.code},{status:e.code==="self_follow"?400:404});throw e;}
}
