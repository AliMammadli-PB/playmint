"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLikeAction } from "./actions";

export function LikeButton({
  gameId,
  initialLiked,
  initialCount,
  loggedIn,
  locale,
  slug,
  labels,
}: {
  gameId: string;
  initialLiked: boolean;
  initialCount: number;
  loggedIn: boolean;
  locale: string;
  slug: string;
  labels: { like: string; liked: string; loginToLike: string };
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      title={loggedIn ? undefined : labels.loginToLike}
      onClick={() => {
        if (!loggedIn) return router.push(`/${locale}/login?next=${encodeURIComponent(`/${locale}/g/${slug}`)}`);
        setLiked(!liked);
        setCount(count + (liked ? -1 : 1));
        start(async () => {
          const r = await toggleLikeAction(gameId);
          if ("liked" in r) {
            setLiked(r.liked);
            setCount(r.count);
          }
        });
      }}
      className={`btn ${liked ? "bg-danger/15 text-danger ring-1 ring-danger/40" : "btn-ghost"}`}
    >
      <span>{liked ? "♥" : "♡"}</span>
      {liked ? labels.liked : labels.like}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
