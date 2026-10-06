import fs from "node:fs";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: RouteContext<"/api/source/[versionId]">) {
  const { versionId } = await ctx.params;
  const rows = await db
    .select({ v: schema.gameVersions, slug: schema.games.slug, developerId: schema.games.developerId })
    .from(schema.gameVersions)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
    .where(eq(schema.gameVersions.id, versionId))
    .limit(1);
  const row = rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  if (row.v.status !== "approved" && row.v.status !== "superseded") {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.id !== row.developerId)) return new Response("Not found", { status: 404 });
  }
  try {
    const stat = await fs.promises.stat(row.v.sourceZipPath);
    return new Response(Readable.toWeb(fs.createReadStream(row.v.sourceZipPath)) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${row.slug}-v${row.v.number}-source.zip"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
