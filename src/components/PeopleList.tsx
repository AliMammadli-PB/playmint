import Link from "next/link";
import {num} from "@/lib/format";
import type {Locale} from "@/lib/i18n/config";
import type {CommunityProfile} from "@/lib/community";
import {FollowButton} from "./FollowButton";
export function PeopleList({profiles,locale,viewerId}:{profiles:CommunityProfile[];locale:Locale;viewerId?:string}){return <div className="people-list">{profiles.map(p=><article className="person-row" key={p.id}><Link href={`/${locale}/u/${p.handle}`} className="person-identity"><span className="person-avatar" aria-hidden="true">{p.name.slice(0,1).toUpperCase()}</span><div><h2>{p.name}</h2><p>@{p.handle}</p><p>{num(p.followers,locale)} {locale==="en"?"subscribers":locale==="az"?"abunəçi":"abone"}</p></div></Link><FollowButton targetId={p.id} handle={p.handle} locale={locale} following={p.following} viewerId={viewerId}/></article>)}</div>;}
