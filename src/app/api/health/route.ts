import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {}
  return Response.json({ ok: dbOk, service: "playmint", time: new Date().toISOString() }, { status: dbOk ? 200 : 503 });
}
