"use server";
import {headers} from "next/headers";
import {getCurrentUser} from "@/lib/auth";
import {audit} from "@/lib/audit";
import {clientIp,rateLimit} from "@/lib/rate-limit";
import {isLocale} from "@/lib/i18n/config";
export type ContactState={error?:string;success?:boolean}|null;
export async function contactAction(_prev:ContactState,form:FormData):Promise<ContactState>{
 const locale=isLocale(form.get("locale"))?String(form.get("locale")):"tr",en=locale==="en",az=locale==="az";
 const error=en?"Check your email, topic and message (20–5,000 characters).":az?"E-poçtu, mövzunu və mesajı yoxla (20–5.000 simvol).":"E-posta, konu ve mesajı kontrol et (20–5.000 karakter).";
 if(form.get("website"))return {error};
 if(!rateLimit(`contact:${clientIp(await headers())}`,5,3600000))return {error:en?"Too many requests. Try again in an hour.":az?"Çox müraciət göndərildi. Bir saat sonra yenidən yoxla.":"Çok fazla talep. Bir saat sonra tekrar dene."};
 const email=String(form.get("email")??"").trim(),message=String(form.get("message")??"").trim(),topic=String(form.get("topic")??""),url=String(form.get("url")??"").trim();
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||message.length<20||message.length>5000||!["support","privacy","copyright","game","payment"].includes(topic)||url.length>1000)return {error};
 if(url){try{const parsed=new URL(url);if(!["https:","http:"].includes(parsed.protocol))return {error};}catch{return {error};}}
 const user=await getCurrentUser();await audit(user?.id??null,"platform.report",url,{email,message,topic,locale,status:"open"});return {success:true};
}
