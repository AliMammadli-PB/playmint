import {createHmac,timingSafeEqual} from "node:crypto";
export function verifyAdSignature(raw:string,timestamp:string,signature:string,secret:string,now=Date.now()) {
 if(!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||!/^([a-f0-9]{64})$/.test(signature))return false;
 const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest();
 return timingSafeEqual(expected,Buffer.from(signature,"hex"));
}
