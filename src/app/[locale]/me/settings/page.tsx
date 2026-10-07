import {eq} from "drizzle-orm";
import {resolveLocale} from "@/lib/i18n";
import {requireUser} from "@/lib/auth";
import {db,schema} from "@/lib/db";
import {StudioHeading} from "@/components/Studio";
import {AccountForm} from "./AccountForm";
export default async function Settings({params}:PageProps<"/[locale]/me/settings">){const {locale}=await resolveLocale(params);const user=await requireUser(locale);const [profile]=await db.select({username:schema.users.username}).from(schema.users).where(eq(schema.users.id,user.id));return <div className="space-y-7"><StudioHeading eyebrow="YOUR ACCOUNT" title={locale==="en"?"Account settings":locale==="az"?"Hesab ayarları":"Hesap ayarları"} accent="violet"/><AccountForm locale={locale} name={user.name} email={user.email} username={profile.username}/></div>;}
