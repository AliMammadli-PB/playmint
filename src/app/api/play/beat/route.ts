import { crossOrigin } from "@/lib/origin";
import { headers } from "next/headers";
import { heartbeat } from "@/lib/play";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (crossOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  if (typeof body.token !== "string" || body.token.length > 200) return Response.json({ ok: false }, { status: 400 });
  if (!rateLimit(`beat:${clientIp(await headers())}`, 40, 60_000)) return Response.json({ ok: false }, { status: 429 });
  const credited = await heartbeat(body.token);
  return Response.json({ ok: credited > 0, credited });
}
