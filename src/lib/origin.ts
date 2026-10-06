import { env } from "@/lib/env";

/** Reject cross-origin (incl. sandboxed "null" origin) calls to mutating API routes. */
export function crossOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(env.siteUrl).origin, new URL(req.url).origin]);
  return !allowed.has(origin);
}
