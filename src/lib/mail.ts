import { createHash, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { newId, randomToken } from "@/lib/ids";

const logoCid = "playmint-logo";

function logoAttachment() {
  const content = readFileSync(path.join(process.cwd(), "public/brand/logo.png")).toString("base64");
  return { filename: "logo.png", content, content_id: logoCid };
}

export function renderMail(opts: { title: string; intro: string; code?: string; buttonHref?: string; buttonLabel?: string; note?: string }) {
  const code = opts.code
    ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#08784e;font-weight:700;">Kod</p><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:34px;letter-spacing:8px;font-weight:700;color:#17382b;background:#e7f6ee;border-radius:12px;padding:16px 8px;text-align:center;">${opts.code}</p>`
    : "";
  const button = opts.buttonHref && opts.buttonLabel
    ? `<p style="margin:8px 0 0;"><a href="${opts.buttonHref}" style="display:inline-block;background:#08784e;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;line-height:1.2;padding:14px 22px;border-radius:10px;">${opts.buttonLabel}</a></p>`
    : "";
  const note = opts.note
    ? `<p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#657368;">${opts.note}</p>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f1ea;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #dce3d8;border-radius:18px;"><tr><td align="center" style="padding:32px 28px 8px;"><img src="cid:${logoCid}" width="72" height="72" alt="Playmint" style="display:block;border:0;border-radius:18px;"/><p style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1;font-weight:700;color:#17382b;letter-spacing:-0.04em;">play<span style="color:#08784e;">mint</span><span style="color:#7c3aed;">.</span></p></td></tr><tr><td style="padding:12px 32px 32px;"><h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.25;color:#17382b;">${opts.title}</h1><p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#56675d;">${opts.intro}</p>${code}${button}${note}</td></tr></table><p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b8880;">playmint.tr</p></td></tr></table></body></html>`;
}

function hashToken(raw: string) {
  return createHash("sha256").update(`${env.appSecret}:${raw}`).digest("hex");
}

export async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Playmint <noreply@playmint.tr>",
      to: [to],
      subject,
      html,
      attachments: [logoAttachment()],
    }),
  });
  if (!res.ok) {
    let error = "send failed";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) error = body.message.slice(0, 180);
    } catch {
      /* keep generic */
    }
    return { ok: false as const, error };
  }
  return { ok: true as const };
}

async function issueToken(email: string, purpose: "register" | "reset", raw: string, minutes: number) {
  const now = new Date();
  await db.delete(schema.emailTokens).where(and(eq(schema.emailTokens.email, email), eq(schema.emailTokens.purpose, purpose), isNull(schema.emailTokens.usedAt)));
  await db.delete(schema.emailTokens).where(lt(schema.emailTokens.expiresAt, now));
  await db.insert(schema.emailTokens).values({
    id: newId(),
    email,
    purpose,
    tokenHash: hashToken(raw),
    expiresAt: new Date(now.getTime() + minutes * 60_000),
  });
}

export function newOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function saveRegisterCode(email: string, code: string) {
  await issueToken(email, "register", code, 10);
}

export async function saveResetToken(email: string, token: string) {
  await issueToken(email, "reset", token, 60);
}

export function newResetToken() {
  return randomToken(32);
}

export async function takeToken(email: string, purpose: "register" | "reset", raw: string) {
  const now = new Date();
  const rows = await db
    .select()
    .from(schema.emailTokens)
    .where(and(eq(schema.emailTokens.email, email), eq(schema.emailTokens.purpose, purpose), eq(schema.emailTokens.tokenHash, hashToken(raw)), isNull(schema.emailTokens.usedAt)));
  return rows.find((item) => item.expiresAt > now) ?? null;
}

export async function takeTokenByRaw(purpose: "register" | "reset", raw: string) {
  if (!raw || raw.length > 200) return null;
  const now = new Date();
  const rows = await db
    .select()
    .from(schema.emailTokens)
    .where(and(eq(schema.emailTokens.purpose, purpose), eq(schema.emailTokens.tokenHash, hashToken(raw)), isNull(schema.emailTokens.usedAt)));
  return rows.find((item) => item.expiresAt > now) ?? null;
}

export async function consumeToken(id: string) {
  await db.update(schema.emailTokens).set({ usedAt: new Date() }).where(eq(schema.emailTokens.id, id));
}
