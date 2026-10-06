import { randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";

/** 20-char lowercase base32 id (100 bits of randomness). */
export function newId(): string {
  const bytes = randomBytes(20);
  let out = "";
  for (const b of bytes) out += alphabet[b & 31];
  return out;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
