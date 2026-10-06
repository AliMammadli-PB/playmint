"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Labels = { play: string; fullscreen: string; premiumTitle: string; premiumText: string; premiumCta: string; sandboxNote: string; error: string };

export function Player({
  gameId,
  previewVersionId,
  sandbox,
  orientation,
  locked,
  locale,
  cover,
  labels,
}: {
  gameId: string;
  previewVersionId?: string;
  sandbox: string;
  orientation: string;
  locked: boolean;
  locale: string;
  cover: React.ReactNode;
  labels: Labels;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "premium" | "error">(locked ? "premium" : "idle");
  const [url, setUrl] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
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

  const aspect = orientation === "portrait" ? "aspect-[9/16] max-h-[80vh] mx-auto" : "aspect-video";

  return (
    <div>
      <div ref={wrap} className={`relative w-full overflow-hidden rounded-2xl border border-line bg-black ${aspect} [&:fullscreen]:rounded-none [&:fullscreen]:border-0`}>
        {state === "playing" && url ? (
          <iframe
            src={url}
            title="game"
            sandbox={sandbox}
            allow="fullscreen; gamepad; autoplay"
            referrerPolicy="no-referrer"
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
                  <Link href={`/${locale}/premium`} className="btn mt-5 bg-amber text-ink hover:bg-amber/90">
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
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-faint">
        <span>🔒 {labels.sandboxNote}</span>
        {state === "playing" && (
          <button onClick={() => wrap.current?.requestFullscreen?.()} className="btn btn-ghost btn-sm">
            ⛶ {labels.fullscreen}
          </button>
        )}
      </div>
    </div>
  );
}
