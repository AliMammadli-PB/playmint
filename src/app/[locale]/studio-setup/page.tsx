import Link from "next/link";
import {createHash} from "node:crypto";
import {redirect,notFound} from "next/navigation";
import {eq} from "drizzle-orm";
import {db,schema} from "@/lib/db";
import {getCurrentUser} from "@/lib/auth";
import {resolveLocale} from "@/lib/i18n";
import {claimAdmin} from "./actions";
export const metadata={robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Setup({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{token?:string}>}){
 const {locale}=await resolveLocale(params);const {token}=await searchParams;
 if(!token||!/^[a-f0-9]{64}$/.test(token))notFound();
 const row=(await db.select().from(schema.settings).where(eq(schema.settings.key,"adminBootstrap")))[0];const value=row?.value as {hash?:string;expiresAt?:number}|undefined;
 if(!value?.hash||!value.expiresAt||value.expiresAt<Date.now()||value.hash!==createHash("sha256").update(token).digest("hex"))notFound();
 const user=await getCurrentUser();const next=encodeURIComponent(`/${locale}/studio-setup?token=${token}`);
 const en=locale==="en";return <div className="container-pm py-16"><div className="card mx-auto max-w-md p-7 space-y-5"><h1 className="h1">{en?"Set up your admin account":"Yönetici hesabını kur"}</h1>{user?<><p className="text-sm text-muted">{en?"This account will become Playmint's first admin:":"Bu hesap Playmint'in ilk yöneticisi olacak:"}</p><p className="font-semibold">{user.email}</p><form action={claimAdmin}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="token" value={token}/><button className="btn btn-primary w-full">{en?"Activate admin account":"Yönetici hesabını etkinleştir"}</button></form></>:<><p className="text-muted text-sm">{en?"Sign in with your own email account. This link can be used once.":"Kendi e-posta hesabınla giriş yap veya kayıt ol. Bu bağlantı yalnızca bir kez kullanılabilir."}</p><Link href={`/${locale}/register?next=${next}`} className="btn btn-primary w-full">{en?"Create account":"Kayıt ol"}</Link><Link href={`/${locale}/login?next=${next}`} className="btn btn-ghost w-full">{en?"Sign in":"Giriş yap"}</Link></>}</div></div>;
}
