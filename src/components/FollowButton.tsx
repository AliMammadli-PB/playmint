"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
export function FollowButton({targetId,handle,viewerId,following:initial,locale}:{targetId:string;handle:string;viewerId?:string;following:boolean;locale:string}){
 const [following,setFollowing]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState("");const router=useRouter(),en=locale==="en",az=locale==="az";
 useEffect(()=>setFollowing(initial),[initial]);
 if(targetId===viewerId)return null;
 if(!viewerId)return <Link className="btn btn-primary" href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/u/${handle}`)}`}>{en?"Subscribe":az?"Abunə ol":"Abone ol"}</Link>;
 async function change(){setBusy(true);setError("");try{const res=await fetch(`/api/users/${encodeURIComponent(targetId)}/follow`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({following:!following})});if(!res.ok)throw new Error("failed");const data=await res.json();setFollowing(data.following);router.refresh();}catch{setError(en?"Could not update. Try again.":az?"Dəyişiklik saxlanılmadı. Yenidən yoxla.":"Değişiklik kaydedilemedi. Yeniden dene.");}finally{setBusy(false);}}
 return <div className="space-y-2"><button type="button" onClick={change} disabled={busy} aria-pressed={following} className={`btn ${following?"btn-ghost":"btn-primary"}`}>{busy?(en?"Saving…":az?"Saxlanılır…":"Kaydediliyor…"):following?(en?"Unsubscribe":az?"Abunəlikdən çıx":"Abonelikten çık"):(en?"Subscribe":az?"Abunə ol":"Abone ol")}</button>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}</div>;
}
