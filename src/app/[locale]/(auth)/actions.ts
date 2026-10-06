"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newId } from "@/lib/ids";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; email?: string; name?: string } | null;

function localeOf(form: FormData): Locale {
  const l = form.get("locale");
  return isLocale(l) ? l : "tr";
}

function safeNext(form: FormData, locale: Locale) {
  const next = String(form.get("next") ?? "");
  return next.startsWith(`/${locale}`) && !next.startsWith("//") ? next : `/${locale}`;
}

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form);
  const t = getDict(locale).auth;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const password = String(form.get("password") ?? "");
  const keep = { email, name };
  if (!rateLimit(`reg:${clientIp(await headers())}`, 10, 3600_000)) return { error: getDict(locale).common.rateLimited, ...keep };
  if (!name) return { error: t.nameRequired, ...keep };
  if (!z.email().safeParse(email).success) return { error: t.invalidEmail, ...keep };
  if (password.length < 8) return { error: t.weakPassword, ...keep };

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing.length) return { error: t.emailTaken, ...keep };

  const id = newId();
  await db.insert(schema.users).values({
    id,
    email,
    name,
    passwordHash: await hashPassword(password),
    role: env.adminEmails.includes(email) ? "admin" : "player",
    locale,
  });
  await createSession(id);
  redirect(safeNext(form, locale));
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form);
  const t = getDict(locale).auth;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 20, 15 * 60_000) || !rateLimit(`login:${email}`, 10, 15 * 60_000)) {
    return { error: getDict(locale).common.rateLimited, email };
  }
  const user = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (!user || !(await verifyPassword(user.passwordHash, password))) return { error: t.invalid, email };
  if (user.banned) return { error: t.banned, email };
  if (env.adminEmails.includes(email) && user.role !== "admin") {
    await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, user.id));
  }
  await createSession(user.id);
  redirect(safeNext(form, locale));
}

export async function logoutAction(form: FormData) {
  await destroySession();
  redirect(`/${localeOf(form)}`);
}
