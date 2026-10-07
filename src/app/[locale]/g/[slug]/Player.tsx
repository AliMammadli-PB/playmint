"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {parseGameSave,readGameSave} from "@/lib/game-save";

type Labels = { play: string; fullscreen: string; premiumTitle: string; premiumText: string; premiumCta: string; sandboxNote: string; error: string };

export function Player({
  gameId,
  previewVersionId,
  sandbox,
  orientation,
  fullscreenEnabled=true,
  locked,
  locale,
  cover,
  labels,
}: {
  gameId: string;
  previewVersionId?: string;
  sandbox: string;
  orientation: string;
  fullscreenEnabled?:boolean;
  locked: boolean;
  locale: string;
  cover: React.ReactNode;
  labels: Labels;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "premium" | "error">(locked ? "premium" : "idle");
  const [url, setUrl] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const adBusy = useRef(false);
  const adAbort = useRef<AbortController|null>(null);
  const adDialog = useRef<HTMLDivElement>(null);
  const [adUrl,setAdUrl]=useState<string|null>(null);
  const [immersive,setImmersive]=useState(false);
  const [nativeFullscreen,setNativeFullscreen]=useState(false);
  useEffect(()=>{const sync=()=>setNativeFullscreen(document.fullscreenElement===wrap.current||(document as Document & {webkitFullscreenElement?:Element}).webkitFullscreenElement===wrap.current);document.addEventListener("fullscreenchange",sync);document.addEventListener("webkitfullscreenchange",sync);return()=>{document.removeEventListener("fullscreenchange",sync);document.removeEventListener("webkitfullscreenchange",sync);};},[]);

  const token = useRef<string | null>(null);

  async function start() {
    setState("loading");
    try {
      const res = await fetch("/api/play/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId, previewVersionId }),
      });
      const data = await res.json();
      if (res.status === 402) return setState("premium");
      if (!res.ok || !data.url) return setState("error");
      token.current = data.token;
      setUrl(data.url);
      setState("playing");
      if (fullscreenEnabled && window.matchMedia("(max-width: 800px)").matches) setImmersive(true);
    } catch {
      setState("error");
    }
  }

  // Heartbeat comes from the host page, never from the game, so games cannot inflate play time.
  useEffect(() => {
    if (state !== "playing" || !token.current) return;
    const beat = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      fetch("/api/play/beat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.current }),
        keepalive: true,
      }).catch(() => {});
    };
    const id = window.setInterval(beat, 30_000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    if(state!=="playing")return;
    const onMessage=async(e:MessageEvent)=>{
      const data=e.data;
      if(e.source!==frame.current?.contentWindow || !data || data.type!=="playmint:reward-request" || typeof data.id!=="string" || data.id.length>80)return;
      const source=e.source as Window;
      const reply=(completed:boolean,reason:string)=>source.postMessage({type:"playmint:reward-result",id:data.id,completed,reason},"*");
      if(adBusy.current||!token.current){reply(false,"unavailable");return;}
      if(typeof data.placement!=="string" || !/^[a-z0-9_-]{1,40}$/.test(data.placement)){reply(false,"invalid_placement");return;}
      adBusy.current=true;const controller=new AbortController();adAbort.current=controller;
      try{
        const res=await fetch("/api/ads/request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:token.current,placement:data.placement}),signal:controller.signal});
        const ad=await res.json();if(!res.ok){reply(false,ad.error??"unavailable");return;}
        setAdUrl(ad.url);const until=Date.now()+180000;
        while(Date.now()<until&&!controller.signal.aborted){
          const poll=await fetch("/api/ads/status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:token.current,requestId:ad.requestId}),signal:controller.signal});
          if(!poll.ok)throw new Error("unavailable");const status=await poll.json();
          if(status.completed){reply(true,"completed");return;}
          if(status.status!=="pending"){reply(false,"not_completed");return;}
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
        reply(false,"timeout");
      }catch{reply(false,"not_completed");}finally{setAdUrl(null);adBusy.current=false;adAbort.current=null;}
    };
    window.addEventListener("message",onMessage);
    return()=>{window.removeEventListener("message",onMessage);adAbort.current?.abort();};
  },[state]);

  useEffect(()=>{
    if(state!=="playing")return;
    let lastWrite=0;
    const receive=(event:MessageEvent)=>{
      const source=frame.current?.contentWindow,data=event.data;
      if(!source||event.source!==source||!data||data.type!=="playmint:storage"||typeof data.id!=="string"||data.id.length>80)return;
      const reply=(payload:Record<string,unknown>)=>source.postMessage({type:"playmint:storage-result",id:data.id,...payload},"*");
      if(data.op==="load"){try{reply({ok:true,snapshot:readGameSave(window.localStorage,gameId)});}catch{reply({ok:false,snapshot:{}});}return;}
      if(data.op!=="save")return;
      const snapshot=parseGameSave(data.snapshot);if(!snapshot){reply({ok:false,reason:"invalid_save"});return;}
      if(Date.now()-lastWrite<100){reply({ok:false,reason:"throttled"});return;}lastWrite=Date.now();
      try{window.localStorage.setItem(`pm:game-save:${gameId}`,JSON.stringify(snapshot));reply({ok:true});}catch{reply({ok:false,reason:"storage_unavailable"});}
    };
    window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
  },[state,gameId]);

  useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setImmersive(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [immersive]);

  const requestNative = useCallback(async (el: HTMLElement) => {
    const target = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    try {
      if (document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement) return true;
      if (el.requestFullscreen) { await el.requestFullscreen(); return true; }
      if (target.webkitRequestFullscreen) { await target.webkitRequestFullscreen(); return true; }
    } catch { /* phones often reject element fullscreen after a delay or entirely */ }
    return false;
  }, []);

  async function toggleFullscreen() {
    const el = wrap.current;
    if (!el) return;
    const nativeOpen = document.fullscreenElement === el || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement === el;
    if (immersive || nativeOpen) {
      setImmersive(false);
      const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
      return;
    }
    const ok = await requestNative(el);
    if (!ok) setImmersive(true);
  }

  const aspect = orientation === "portrait" ? "aspect-[9/16] max-h-[80vh] mx-auto" : "aspect-video lg:aspect-[4/3]";

  return (
    <div>
      <div ref={wrap} className={`player-stage relative w-full overflow-hidden rounded-2xl border border-line bg-black ${immersive ? "is-immersive" : aspect}`}>
        {state === "playing" && url ? (
          <iframe
            ref={frame}
            src={url}
            title="game"
            sandbox={sandbox}
            allow={fullscreenEnabled?"fullscreen; gamepad; autoplay":"gamepad; autoplay"}
            referrerPolicy="no-referrer"
            allowFullScreen={fullscreenEnabled}
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-50 blur-[2px]">{cover}</div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-ink/90 via-ink/40 to-ink/20 p-6">
              {state === "premium" ? (
                <div className="max-w-md text-center">
                  <div className="text-4xl text-amber">★</div>
                  <h2 className="mt-3 font-display text-2xl font-bold">{labels.premiumTitle}</h2>
                  <p className="mt-2 text-sm text-muted">{labels.premiumText}</p>
                  <Link href="#subscription" className="btn mt-5 bg-amber text-ink hover:bg-amber/90">
                    {labels.premiumCta}
                  </Link>
                </div>
              ) : state === "error" ? (
                <div className="text-center">
                  <p className="text-danger">{labels.error}</p>
                  <button onClick={start} className="btn btn-ghost mt-4">↻ {labels.play}</button>
                </div>
              ) : (
                <button
                  onClick={start}
                  disabled={state === "loading"}
                  className="group flex h-24 w-24 items-center justify-center rounded-full bg-mint text-ink shadow-[0_0_60px_rgb(61_255_176/0.45)] transition hover:scale-105 disabled:opacity-70"
                  aria-label={labels.play}
                >
                  {state === "loading" ? (
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10" aria-hidden>
                      <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </>
        )}
        {state === "playing" && fullscreenEnabled && (
          <button type="button" onClick={toggleFullscreen} className="player-fullscreen btn btn-ghost btn-sm" aria-pressed={immersive||nativeFullscreen}>
            {immersive||nativeFullscreen ? (locale==="en"?"Close fullscreen":locale==="az"?"Tam ekrandan çıx":"Tam ekrandan çık") : labels.fullscreen}
          </button>
        )}
      </div>
      {adUrl&&<div ref={adDialog} role="dialog" aria-modal="true" aria-label={locale==="en"?"Rewarded ad":locale === "az" ? "Mükafatlı reklam" : "Ödüllü reklam"} className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4" onKeyDown={e=>{if(e.key==="Escape"){adAbort.current?.abort();return;}if(e.key!=="Tab"||!adDialog.current)return;const items=[...adDialog.current.querySelectorAll<HTMLElement>("button, iframe, a, input, select, textarea")];if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}><button autoFocus onClick={()=>adAbort.current?.abort()} className="btn btn-ghost mb-3">{locale==="en"?"Close · no reward":locale === "az" ? "Bağla · mükafat verilmir" : "Kapat · ödül verilmez"}</button><iframe title="Rewarded ad" src={adUrl} sandbox="allow-scripts allow-same-origin" className="w-full max-w-3xl h-[60vh] rounded-xl bg-black"/></div>}
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-faint">
        <span className="inline-flex items-center gap-2"><svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>{labels.sandboxNote}</span>
      </div>
    </div>
  );
}
