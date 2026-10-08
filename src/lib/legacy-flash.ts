import { crc32 } from "node:zlib";
import type { Category } from "@/lib/catalog";
import { isCategory, slugify } from "@/lib/catalog";

/** Pinned self-hosted Ruffle build. Do not float this to "latest". */
export const RUFFLE_VERSION = "0.7.0";
export const RUFFLE_PUBLIC_PATH = "/legacy/ruffle/";
export const SOURCE_REPOSITORY = "https://github.com/krestenlaust/swfgames/";
export const SOURCE_REPO_SLUG = "krestenlaust/swfgames";
export const SWF_TREE_URL = `https://api.github.com/repos/${SOURCE_REPO_SLUG}/git/trees/master?recursive=1`;
export const MAX_SWF_BYTES = 32 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(["api.github.com", "github.com", "raw.githubusercontent.com"]);
const PARTICLES = new Set(["of", "to", "and", "the", "a", "an"]);

export type RightsStatus = "verified" | "operator_authorized" | "pending" | "rejected";
export type TechnicalStatus = "pending" | "approved" | "rejected";
export type RuntimeStatus = "untested" | "ok" | "broken";

export type LegacyFlashMeta = {
  sourceType: "github-swf" | "publisher-swf";
  sourceRepository: string;
  sourceFile: string;
  sourceFiles: string[];
  sourceSha: string;
  sha256: string;
  rightsStatus: RightsStatus;
  technicalStatus: TechnicalStatus;
  ruffleVersion: string;
  runtimeStatus: RuntimeStatus;
  ruffleError?: string;
  importedAt: string;
  swfBytes: number;
};

export type SwfSourceFile = { path: string; sha: string; size: number };

const CATEGORY_RULES: [RegExp, Category][] = [
  [/plazma|plasma|burst|raze|strike force|shoot|sniper/i, "shooter"],
  [/boxhead|bubble tank|electricman|smash|sword|sandal|shark|fighter|playing with fire|zombotron/i, "action"],
  [/age of war|\bwar\b|tower|strategy|defense/i, "strategy"],
  [/race|racing|moto|kart/i, "racing"],
  [/puzzle|mahjong|sudoku/i, "puzzle"],
  [/platform|mario/i, "platformer"],
  [/learn to fly|arcade/i, "arcade"],
];

/** Record verified rights or an explicit platform-operator publication instruction. */
export function legacyRightsBlockPublish(report: { legacyFlash?: { rightsStatus?: string } | null } | null | undefined): boolean {
  const status = report?.legacyFlash?.rightsStatus;
  if (!status) return false;
  return status !== "verified" && status !== "operator_authorized";
}

export function titleFromSwfFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const stem = base.replace(/\.swf$/i, "").replace(/[-_](\d{3,})$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const parts = stem.split(" ").filter(Boolean).flatMap(splitTrailingVersion);
  return parts.map((word, index) => formatWord(word, index === 0)).join(" ");
}

export function slugFromTitle(title: string, sourceSha: string): string {
  let slug = slugify(title);
  if (slug.length < 3) slug = `${slug || "swf"}-flash`;
  if (slug.length > 40) slug = slug.slice(0, 40).replace(/-+$/g, "");
  if (!/^[a-z0-9]/.test(slug) || !/[a-z0-9]$/.test(slug)) slug = `swf-${sourceSha.slice(0, 8)}`;
  return slug;
}

export function guessCategory(title: string): Category {
  for (const [pattern, category] of CATEGORY_RULES) if (pattern.test(title)) return category;
  return "arcade";
}

export function assertPlaymintCategory(value: string): Category {
  if (!isCategory(value)) throw new Error("bad_category");
  return value;
}

function splitTrailingVersion(word: string): string[] {
  const match = /^([A-Za-z]{3,})(\d{1,2})$/.exec(word);
  return match ? [match[1], match[2]] : [word];
}

function formatWord(word: string, first: boolean): string {
  const lower = word.toLowerCase();
  if (!first && PARTICLES.has(lower)) return lower;
  const digitLead = /^(\d+)([a-z].*)$/i.exec(word);
  if (digitLead) return digitLead[1] + digitLead[2].charAt(0).toUpperCase() + digitLead[2].slice(1).toLowerCase();
  if (/^\d+$/.test(word)) return word;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function canonicalScore(file: string): number {
  const base = file.split("/").pop() ?? file;
  return /[-_]\d{3,}\.swf$/i.test(base) ? 1 : 0;
}

export function dedupeSwfBlobs(files: SwfSourceFile[]): { unique: { sha: string; size: number; sourceFile: string; sourceFiles: string[] }[]; duplicatesSkipped: number } {
  const groups = new Map<string, SwfSourceFile[]>();
  for (const file of files) {
    if (!/^[0-9a-f]{40}$/.test(file.sha)) throw new Error("bad_sha");
    const list = groups.get(file.sha) ?? [];
    list.push(file);
    groups.set(file.sha, list);
  }
  const unique = [...groups.entries()].map(([sha, list]) => {
    const names = [...list].sort((a, b) => canonicalScore(a.path) - canonicalScore(b.path) || a.path.length - b.path.length || a.path.localeCompare(b.path));
    return { sha, size: names[0].size, sourceFile: names[0].path.split("/").pop() ?? names[0].path, sourceFiles: list.map((item) => item.path).sort() };
  });
  unique.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
  return { unique, duplicatesSkipped: files.length - unique.length };
}

export async function fetchSwfCatalog(options: { fetchImpl?: typeof fetch; token?: string } = {}): Promise<SwfSourceFile[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "playmint-swf-import" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await (options.fetchImpl ?? fetch)(assertAllowedSwfUrl(SWF_TREE_URL), {
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status !== 200) throw new Error(`http_${response.status}`);
  const body = (await response.json()) as { truncated?: boolean; tree?: { path: string; type: string; sha: string; size?: number }[] };
  if (body.truncated || !Array.isArray(body.tree)) throw new Error("tree_truncated");
  return body.tree
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".swf"))
    .map((item) => {
      if (item.path.includes("..") || item.path.startsWith("/") || item.path.includes("\\")) throw new Error("bad_path");
      if (!/^[0-9a-f]{40}$/.test(item.sha)) throw new Error("bad_sha");
      return { path: item.path, sha: item.sha, size: item.size ?? 0 };
    });
}

export function swfBlobUrl(sha: string): string {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("bad_sha");
  return `https://api.github.com/repos/${SOURCE_REPO_SLUG}/git/blobs/${sha}`;
}

export function assertAllowedSwfUrl(raw: string): URL {
  if (raw === SWF_TREE_URL) return new URL(raw);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("bad_url");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("bad_url");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("bad_url");
  const repoPath = `/${SOURCE_REPO_SLUG}/`;
  if (url.hostname === "api.github.com") {
    if (!new RegExp(`^/repos/${SOURCE_REPO_SLUG}/git/blobs/[0-9a-f]{40}$`).test(url.pathname)) throw new Error("bad_url");
  } else if (!url.pathname.startsWith(repoPath) || !url.pathname.toLowerCase().endsWith(".swf")) {
    throw new Error("bad_url");
  }
  return url;
}

export function isSwfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  const version = bytes[3];
  return (magic === "FWS" || magic === "CWS" || magic === "ZWS") && version >= 1 && version <= 50;
}

export async function downloadSwf(url: string, options: { fetchImpl?: typeof fetch; maxBytes?: number; timeoutMs?: number; redirects?: number; token?: string } = {}): Promise<Buffer> {
  const maxBytes = options.maxBytes ?? MAX_SWF_BYTES;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: "application/vnd.github.raw", "User-Agent": "playmint-swf-import" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let current = assertAllowedSwfUrl(url).toString();
  let redirects = options.redirects ?? 3;
  while (true) {
    const response = await fetchImpl(current, {
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status >= 300 && response.status < 400) {
      if (redirects <= 0) throw new Error("too_many_redirects");
      const location = response.headers.get("location");
      if (!location) throw new Error("bad_redirect");
      current = assertAllowedSwfUrl(new URL(location, current).toString()).toString();
      redirects -= 1;
      continue;
    }
    if (response.status !== 200) throw new Error(`http_${response.status}`);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > maxBytes) throw new Error("too_large");
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0 || body.length > maxBytes) throw new Error("too_large");
    if (!isSwfMagic(body)) throw new Error("invalid_swf");
    return body;
  }
}

export function assertRuffleBase(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("bad_ruffle_base");
  }
  const local = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.username || url.password || url.search || url.hash || !url.pathname.endsWith("/")) throw new Error("bad_ruffle_base");
  if (url.protocol !== "https:" && !local) throw new Error("bad_ruffle_base");
  return url.toString();
}

export function createSwfWrapper(input: { swfFile: string; title: string; ruffleBaseUrl: string }): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.swf$/.test(input.swfFile)) throw new Error("bad_swf_name");
  const ruffleBase = assertRuffleBase(input.ruffleBaseUrl);
  const title = input.title.replace(/[\u0000-\u001f<>]/g, "").slice(0, 120) || "Legacy Flash";
  const config = {
    url: `./${input.swfFile}`,
    allowScriptAccess: false,
    allowNetworking: "internal",
    openUrlMode: "deny",
    autoplay: "on",
    backgroundColor: "#000000",
    letterbox: "on",
    unmuteOverlay: "hidden",
    splashScreen: false,
    showSwfDownload: false,
    allowFullscreen: true,
    upgradeToHttps: true,
    warnOnUnsupportedContent: true,
    publicPath: ruffleBase,
    polyfills: false,
    credentialAllowList: [] as string[],
    socketProxy: [] as string[],
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000;color:#f4f1ea;font-family:sans-serif}
#stage,ruffle-player,#ruffle-player{width:100%;height:100%;display:block}
#load,#fail{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
#fail{display:none;background:#111}
#hint{display:none}
@media (max-width:800px){
  #hint{display:block;position:absolute;left:12px;right:12px;top:12px;z-index:2;margin:0;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.72);color:#fff;font-size:14px;line-height:1.4;pointer-events:none}
}
</style>
</head>
<body data-runtime="loading">
<div id="stage"></div>
<p id="hint">Bu oyun klavye/fare için tasarlanmıştır.</p>
<div id="load">Loading</div>
<div id="fail" role="alert"></div>
<script>
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = ${JSON.stringify({ polyfills: false, allowScriptAccess: false, allowNetworking: "internal", openUrlMode: "deny", credentialAllowList: [], socketProxy: [] })};
</script>
<script src=${JSON.stringify(ruffleBase + "ruffle.js")}></script>
<script>
(async function () {
  var load = document.getElementById("load");
  var fail = document.getElementById("fail");
  var stage = document.getElementById("stage");
  function showError(message) {
    document.body.dataset.runtime = "error";
    document.body.dataset.error = message;
    load.style.display = "none";
    fail.style.display = "flex";
    fail.textContent = message;
  }
  try {
    var api = window.RufflePlayer && window.RufflePlayer.newest && window.RufflePlayer.newest();
    if (!api) throw new Error("Ruffle did not load");
    var player = api.createPlayer();
    player.id = "ruffle-player";
    player.style.width = "100%";
    player.style.height = "100%";
    player.tabIndex = 0;
    stage.appendChild(player);
    await player.load(${JSON.stringify(config)});
    player.focus();
    load.style.display = "none";
    document.body.dataset.runtime = "ok";
  } catch (error) {
    showError(error && error.message ? error.message : "This Flash game could not be started.");
  }
})();
</script>
</body>
</html>
`;
}

export function legacyCoverSvg(title: string): string {
  const safe = escapeHtml(title.slice(0, 80) || "Legacy Flash");
  const hue = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 40;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="hsl(${150 + hue} 42% 14%)"/>
  <rect width="18" height="720" fill="#7c3aed"/>
  <rect y="600" width="1280" height="120" fill="#08784e"/>
  <text x="72" y="250" fill="#d6ff63" font-family="sans-serif" font-size="28" font-weight="700">LEGACY FLASH</text>
  <text x="72" y="360" fill="#f4f1ea" font-family="sans-serif" font-size="64" font-weight="700">${safe}</text>
</svg>`;
}

export function storeZip(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    if (!/^[A-Za-z0-9._/-]+$/.test(file.name) || file.name.includes("..")) throw new Error("bad_zip_name");
    const name = Buffer.from(file.name);
    const checksum = crc32(file.data) >>> 0;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    locals.push(local, file.data);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
