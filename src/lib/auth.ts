import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/ids";
import type { Locale } from "@/lib/i18n/config";
import type { User } from "@/lib/db/schema";

const secure = env.siteUrl.startsWith("https://");
export const sessionCookie = secure ? "__Host-pm_session" : "pm_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(sessionCookie, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  jar.delete(sessionCookie);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "locale">;

/** Current signed-in user (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      locale: schema.users.locale,
      banned: schema.users.banned,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.banned) return null;
  const { banned: _banned, ...user } = row;
  return user;
});

export async function requireUser(locale: Locale): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

export async function requireDeveloper(locale: Locale): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.role !== "developer" && user.role !== "admin") redirect(`/${locale}/developers`);
  return user;
}

export async function requireAdmin(locale: Locale): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.role !== "admin") redirect(`/${locale}`);
  return user;
}
