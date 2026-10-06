import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { paths } from "@/lib/env";
import { mimeFor } from "@/lib/mime";

export async function GET(_req: Request, ctx: RouteContext<"/media/covers/[file]">) {
  const { file } = await ctx.params;
  if (!/^[a-z0-9-]+\.(png|jpg|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  const full = path.join(paths.covers(), file);
  try {
    const stat = await fs.promises.stat(full);
    return new Response(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
      headers: {
        "Content-Type": mimeFor(full),
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
