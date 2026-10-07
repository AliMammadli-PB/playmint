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
import { newOtp, newResetToken, renderMail, saveRegisterCode, saveResetToken, sendMail, takeToken, takeTokenByRaw } from "@/lib/mail";
import { registrationDetails } from "@/lib/registration";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; email?: string; name?: string; username?:string; role?:string } | null;

function localeOf(form: FormData): Locale {
  const l = form.get("locale");
  return isLocale(l) ? l : "tr";
}

function safeNext(form: FormData, locale: Locale, role="player") {
  const next = String(form.get("next") ?? "");
  return next.startsWith(`/${locale}`) && !next.startsWith("//") ? next : `/${locale}${role === "developer" || role === "admin" ? "/dev" : "/games"}`;
}

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form);
  const t = getDict(locale).auth;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const password = String(form.get("password") ?? "");
  const username=String(form.get("username")??"").trim().toLowerCase();
  const role=String(form.get("role")??"");
  const keep = { email, name, username, role };
  const invalid=registrationDetails({username,role,password,confirm:String(form.get("passwordConfirm")??"")});
  const en=locale==="en",az=locale==="az";
  if(invalid)return {error:invalid==="confirm"?(en?"Passwords do not match.":az?"Şifrələr eyni deyil.":"Şifreler eşleşmiyor."):invalid==="role"?(en?"Choose player or developer.":az?"Oyunçu və ya geliştirici seç.":"Oyuncu veya geliştirici seç."):invalid==="username"?(en?"Username: 3–24 letters, numbers, underscores or hyphens.":az?"İstifadəçi adı: 3–24 kiçik hərf, rəqəm, alt xətt və ya tire.":"Kullanıcı adı: 3–24 küçük harf, rakam, alt çizgi veya tire."):(en?"Password must contain 8–128 characters.":az?"Şifrə 8–128 simvol olmalıdır.":"Şifre 8–128 karakter olmalı."),...keep};
  if (!rateLimit(`reg:${clientIp(await headers())}`, 10, 3600_000)) return { error: getDict(locale).common.rateLimited, ...keep };
  if (!name) return { error: t.nameRequired, ...keep };
  if (!z.email().safeParse(email).success) return { error: t.invalidEmail, ...keep };
  if (password.length < 8) return { error: t.weakPassword, ...keep };

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing.length) return { error: t.emailTaken, ...keep };

  const id = newId();
  const taken=await db.select({id:schema.users.id}).from(schema.users).where(eq(schema.users.username,username));
  const handleTaken=await db.select({id:schema.developerProfiles.userId}).from(schema.developerProfiles).where(eq(schema.developerProfiles.handle,username));
  if(taken.length||handleTaken.length)return {error:en?"Username is already taken.":az?"İstifadəçi adı artıq istifadə olunur.":"Bu kullanıcı adı kullanımda.",...keep};
  const otp = String(form.get("otp") ?? "").trim();
  const codeRow = /^\d{6}$/.test(otp) ? await takeToken(email, "register", otp) : null;
  if (!codeRow) return { error: t.badCode, ...keep };
  const passwordHash=await hashPassword(password);
  try {await db.transaction(async tx=>{
    await tx.insert(schema.users).values({id,email,name,username,passwordHash,role:role as "player"|"developer",locale});
    if(role==="developer")await tx.insert(schema.developerProfiles).values({userId:id,handle:username,displayName:name});
    await tx.update(schema.emailTokens).set({ usedAt: new Date() }).where(eq(schema.emailTokens.id, codeRow.id));
  });}catch(err){const error=err as {code?:string;cause?:{code?:string}};if(error.code==="23505"||error.cause?.code==="23505")return {error:en?"Email or username is already taken.":az?"E-poçt və ya istifadəçi adı artıq istifadə olunur.":"E-posta veya kullanıcı adı kullanımda.",...keep};throw err;}
  await createSession(id);
  redirect(safeNext(form, locale, role));
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
  await createSession(user.id);
  redirect(safeNext(form, locale, user.role));
}

export async function logoutAction(form: FormData) {
  await destroySession();
  redirect(`/${localeOf(form)}`);
}

export async function sendRegisterCode(localeRaw: string, emailRaw: string): Promise<{ ok: boolean; message: string }> {
  const locale = isLocale(localeRaw) ? localeRaw : "tr";
  const t = getDict(locale).auth;
  const email = emailRaw.trim().toLowerCase();
  const en = locale === "en";
  const az = locale === "az";
  if (!z.email().safeParse(email).success) return { ok: false, message: t.invalidEmail };
  const ip = clientIp(await headers());
  if (!rateLimit(`otp-ip:${ip}`, 8, 3600_000) || !rateLimit(`otp:${email}`, 5, 15 * 60_000)) {
    return { ok: false, message: getDict(locale).common.rateLimited };
  }
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length) return { ok: false, message: t.emailTaken };
  const code = newOtp();
  await saveRegisterCode(email, code);
  const sent = await sendMail(
    email,
    en ? "Your Playmint code" : az ? "Playmint təsdiq kodun" : "Playmint doğrulama kodun",
    renderMail({
      title: en ? "Your verification code" : az ? "Təsdiq kodun" : "Doğrulama kodun",
      intro: en ? "Enter this code to finish creating your Playmint account." : az ? "Playmint hesabını tamamlamaq üçün bu kodu yaz." : "Playmint hesabını tamamlamak için bu kodu yaz.",
      code,
      note: en ? "The code expires in 10 minutes. If you did not ask for it, ignore this email." : az ? "Kod 10 dəqiqə keçərlidir. Sən istəməmisənsə, bu məktuba fikir vermə." : "Kod 10 dakika geçerlidir. Sen istemediysen bu e-postayı yok say.",
    }),
  );
  if (!sent.ok) return { ok: false, message: t.mailFailed };
  return { ok: true, message: t.codeSent };
}

export type ForgotState = { error?: string; notice?: string; email?: string } | null;

export async function forgotPasswordAction(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const locale = localeOf(form);
  const t = getDict(locale).auth;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: t.invalidEmail, email };
  const ip = clientIp(await headers());
  if (!rateLimit(`reset-ip:${ip}`, 8, 3600_000) || !rateLimit(`reset:${email}`, 5, 15 * 60_000)) {
    return { error: getDict(locale).common.rateLimited, email };
  }
  const user = (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (user) {
    const token = newResetToken();
    await saveResetToken(email, token);
    const link = `${env.siteUrl}/${locale}/reset?token=${encodeURIComponent(token)}`;
    const en = locale === "en";
    const az = locale === "az";
    const sent = await sendMail(
      email,
      en ? "Reset your Playmint password" : az ? "Playmint şifrəni sıfırla" : "Playmint şifreni sıfırla",
      renderMail({
        title: en ? "Set a new password" : az ? "Yeni şifrə təyin et" : "Yeni şifre belirle",
        intro: en ? "Use the button to choose a new password for your Playmint account." : az ? "Playmint hesabın üçün yeni şifrə seçmək üçün düyməyə bas." : "Playmint hesabın için yeni şifre seçmek üzere düğmeye bas.",
        buttonHref: link,
        buttonLabel: en ? "Choose a new password" : az ? "Yeni şifrə seç" : "Yeni şifre seç",
        note: en ? "This link expires in 1 hour. If you did not ask for it, ignore this email." : az ? "Keçid 1 saat keçərlidir. Sən istəməmisənsə, bu məktuba fikir vermə." : "Bağlantı 1 saat geçerlidir. Sen istemediysen bu e-postayı yok say.",
      }),
    );
    if (!sent.ok) return { error: t.mailFailed, email };
  }
  return { notice: t.forgotSent, email };
}

export async function resetPasswordAction(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const locale = localeOf(form);
  const t = getDict(locale).auth;
  const en = locale === "en";
  const az = locale === "az";
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("passwordConfirm") ?? "");
  if (password.length < 8 || password.length > 128) return { error: t.weakPassword };
  if (password !== confirm) return { error: en ? "Passwords do not match." : az ? "Şifrələr eyni deyil." : "Şifreler eşleşmiyor." };
  const row = await takeTokenByRaw("reset", token);
  if (!row) return { error: t.resetInvalid };
  const user = (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, row.email)).limit(1))[0];
  if (!user) return { error: t.resetInvalid };
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, user.id));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
    await tx.update(schema.emailTokens).set({ usedAt: new Date() }).where(eq(schema.emailTokens.id, row.id));
  });
  redirect(`/${locale}/login?reset=1`);
}
