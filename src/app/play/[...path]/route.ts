import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { paths } from "@/lib/env";
import { mimeFor } from "@/lib/mime";

/**
 * Fallback server for uploaded game files (nginx serves /play/ directly in production).
 * The CSP `sandbox` header forces an opaque origin even when the file is opened directly,
 * so game code can never act as playmint.tr.
 */
const gameFileHeaders = {
  "Content-Security-Policy": "sandbox allow-scripts allow-pointer-lock allow-popups allow-forms allow-modals allow-downloads; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

export async function GET(_req: Request, ctx: RouteContext<"/play/[...path]">) {
  const { path: parts } = await ctx.params;
  const root = paths.games();
  const file = path.resolve(root, ...parts.map((p) => decodeURIComponent(p)));
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!stat.isFile()) return new Response("Not found", { status: 404 });
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      ...gameFileHeaders,
      "Content-Type": mimeFor(file),
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
