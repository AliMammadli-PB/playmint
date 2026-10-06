import "server-only";
import { db, schema } from "@/lib/db";

export async function audit(actorId: string | null, action: string, target = "", data: object = {}) {
  await db.insert(schema.auditLog).values({ actorId, action, target, data });
}
