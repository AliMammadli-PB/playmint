import path from "node:path";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  get appSecret() {
    return required("APP_SECRET");
  },
  siteUrl: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  /** Origin that serves uploaded game files. Empty → same-origin strict sandbox under /play. */
  gameOrigin: (process.env.GAME_ORIGIN || "").replace(/\/$/, ""),
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), ".data"),
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

/** Base URL under which /<versionId>/<entry> game files are reachable. */
export function gameFilesBase(): string {
  return env.gameOrigin ? env.gameOrigin : `${env.siteUrl}/play`;
}

/** Separate origin → iframe may keep its own origin (localStorage works). Same origin → opaque sandbox. */
export function gameSandbox(): string {
  const base = "allow-scripts allow-pointer-lock allow-popups allow-forms allow-modals allow-downloads";
  return env.gameOrigin ? `${base} allow-same-origin` : base;
}

export const paths = {
  games: () => path.join(env.dataDir, "games"),
  sources: () => path.join(env.dataDir, "sources"),
  covers: () => path.join(env.dataDir, "covers"),
  uploads: () => path.join(env.dataDir, "uploads"),
};
