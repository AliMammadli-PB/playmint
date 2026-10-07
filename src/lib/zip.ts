import "server-only";
import yauzl from "yauzl";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { ScanReport } from "@/lib/db/schema";

export const MAX_FILES = 10000;
export const MAX_TOTAL_BYTES = 512 * 1024 * 1024;

const allowedExt = new Set(
  (
    "html htm css js mjs cjs json map txt md csv xml " +
    "png jpg jpeg gif webp avif svg ico bmp " +
    "mp3 ogg oga wav m4a aac flac opus weba mp4 webm ogv " +
    "ttf otf woff woff2 fnt " +
    "wasm data unityweb glb gltf bin obj mtl ktx2 basis hdr " +
    "atlas tmx tsx tsj ldtk"
  ).split(" "),
);
const allowedBare = new Set(["license", "licence", "readme", "copying", "notice", "changelog", "authors"]);
const ignored = (name: string) =>
  /(^|\/)(node_modules|\.git|\.vite|\.cache|coverage|test-results|qa-screenshots|e2e|tests|assets_raw|downloads|release)(\/|$)/i.test(name) || name.startsWith("__MACOSX/") || /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(name) || /(^|\/)\.git\//.test(name);
const textExt = new Set(["html", "htm", "js", "mjs", "cjs", "css", "json", "svg", "xml"]);

export class ZipError extends Error {
  constructor(public code: string, public detail = "") {
    super(code);
  }
}

type Entry = { name: string; size: number; isDir: boolean };

function openZip(file: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.open(file, { lazyEntries: true, validateEntrySizes: true, strictFileNames: false }, (err, zip) =>
      err || !zip ? reject(new ZipError("zip_invalid", err?.message)) : resolve(zip),
    ),
  );
}

function isSymlink(e: yauzl.Entry) {
  return ((e.externalFileAttributes >>> 16) & 0o170000) === 0o120000;
}

function safeRelative(name: string): string | null {
  const norm = name.replace(/\\/g, "/");
  if (norm.startsWith("/") || /^[a-zA-Z]:/.test(norm)) return null;
  const parts = norm.split("/").filter((p) => p !== "" && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return parts.join("/");
}

async function listEntries(file: string): Promise<Entry[]> {
  const zip = await openZip(file);
  const out: Entry[] = [];
  let total = 0;
  let ignoredCount=0;
  let scannedEntries=0;
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("entry", (e: yauzl.Entry) => {
        if(++scannedEntries>250000)return reject(new ZipError("zip_too_many_files"));
        const checked=safeRelative(e.fileName);if(checked===null)return reject(new ZipError("zip_unsafe_path",e.fileName));
        if(ignored(checked)){if(!e.fileName.endsWith("/"))ignoredCount++;return zip.readEntry();}
        if (isSymlink(e)) return reject(new ZipError("zip_symlink", e.fileName));
        const rel = safeRelative(e.fileName);
        if (rel === null) return reject(new ZipError("zip_unsafe_path", e.fileName));
        const isDir = e.fileName.endsWith("/");
        if (!isDir && rel && !ignored(e.fileName)) {
          total += e.uncompressedSize;
          out.push({ name: rel, size: e.uncompressedSize, isDir });
          if (out.length > 250000) return reject(new ZipError("zip_too_many_files"));

        }
        zip.readEntry();
      });
      zip.on("end", resolve);
      zip.on("error", (err) => reject(new ZipError("zip_invalid", String(err))));
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
  return Object.assign(out,{ignoredCount});
}

async function readZipText(zipPath:string,name:string):Promise<string> {
 const zip=await openZip(zipPath);
 try{return await new Promise<string>((resolve,reject)=>{
  zip.on("entry",e=>{if(safeRelative(e.fileName)!==name)return zip.readEntry();if(e.uncompressedSize>1024*1024)return reject(new ZipError("zip_invalid","Manifest too large"));zip.openReadStream(e,(err,stream)=>{if(err||!stream)return reject(new ZipError("zip_invalid"));let size=0;const chunks:Buffer[]=[];stream.on("data",chunk=>{size+=chunk.length;if(size>1024*1024){stream.destroy();reject(new ZipError("zip_invalid"));}else chunks.push(chunk);});stream.on("error",reject);stream.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));});});zip.on("end",()=>reject(new ZipError("zip_invalid")));zip.on("error",reject);zip.readEntry();});}finally{zip.close();}
}
async function detectProject(zipPath:string,entries:Entry[]) {
 const names=new Set(entries.map(e=>e.name));
 const tops=new Set(entries.map(e=>e.name.split("/")[0]));
 const wrapped=tops.size===1&&entries.some(e=>e.name.includes("/"))?[...tops][0]+"/":"";
 const root=names.has("package.json")?"":wrapped&&names.has(wrapped+"package.json")?wrapped:names.has("index.html")?"":wrapped;
 let scripts:string[]=[];let isProject=false;
 if(names.has(root+"package.json")){
  let manifest;try{manifest=JSON.parse(await readZipText(zipPath,root+"package.json"));}catch{throw new ZipError("zip_invalid","Invalid package.json");}
  if(!manifest||typeof manifest!=="object"||Array.isArray(manifest))throw new ZipError("zip_invalid","Invalid package.json");
  scripts=manifest.scripts&&typeof manifest.scripts==="object"?Object.keys(manifest.scripts).slice(0,30):[];isProject=true;
 }
 const outputs=isProject?["dist/","build/","out/",""]:["","dist/","build/","out/"];
 for(const output of outputs){
  const candidate=root+output+"index.html";
  const actual=[...names].find(n=>n.toLowerCase()===candidate.toLowerCase());if(!actual)continue;
  if(output===""&&isProject){const html=await readZipText(zipPath,actual);if(scripts.includes("build")||scripts.includes("start")||/<script[^>]+src=["'][^"']*(?:\.tsx?(?:[?"'])|\/src\/)/i.test(html))continue;}
  return {root,publicRoot:actual.slice(0,-10),entryName:actual.slice(-10),kind:"browser" as const,scripts,sourceProject:isProject};
 }
 const nested=[...names].filter(n=>/(?:^|\/)(dist|build|out)\/index\.html$/i.test(n)).sort((a,b)=>a.split("/").length-b.split("/").length||a.localeCompare(b));
 if(nested.length){const actual=nested[0],publicRoot=actual.slice(0,-10);const parents=[...names].filter(n=>n.endsWith("package.json")&&publicRoot.startsWith(n.slice(0,-12))).sort((a,b)=>b.length-a.length);const selectedRoot=parents[0]?.slice(0,-12)??"";return {root:selectedRoot,publicRoot,entryName:actual.slice(-10),kind:"browser" as const,scripts,sourceProject:parents.length>0||isProject};}
 if(isProject && (scripts.includes("start")||scripts.includes("build")||scripts.includes("dev")))return {root,publicRoot:null,entryName:"",kind:scripts.includes("start")&&!scripts.includes("build")?"node-source" as const:"frontend-source" as const,scripts,sourceProject:true};
 throw new ZipError("zip_no_index");
}
export async function rebaseGameAssets(directory:string,files:{path:string;size:number}[],publicBase:string){
 const names=new Set(files.map(f=>f.path));
 for(const f of files){if(!["html","htm","css","js","mjs","json"].includes(extOf(f.path))||f.size>5*1024*1024)continue;
  const file=path.join(directory,f.path);const original=await fs.readFile(file,"utf8");
  const updated=original.replace(/(["'`(=])\/(?!\/)([^"'`\s<>)]*)/g,(all,start,asset)=>{
   const clean=asset.split(/[?#]/)[0];let decoded;try{decoded=decodeURIComponent(clean);}catch{return all;}
   if(!names.has(decoded))return all;
   return `${start}${publicBase.replace(/\/$/,"")}/${asset}`;
  });
  if(updated!==original)await fs.writeFile(file,updated);
 }
}

const extOf = (name: string) => {
  const base = name.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
};

const ignoredHosts = new Set(["www.w3.org", "w3.org", "schemas.xmlsoap.org", "ns.adobe.com", "purl.org", "www.apache.org", "opensource.org", "github.com", "creativecommons.org", "www.gnu.org", "gnu.org", "mozilla.org", "developer.mozilla.org", "reactjs.org", "fb.me"]);

const suspicious: [RegExp, string][] = [
  [/coinhive|coin-hive|cryptonight|cryptoloot|webminer|minero\.cc|monerominer|\bwebmr\b/i, "crypto_miner"],
  [/document\.cookie/, "reads_cookies"],
  [/\b(top|parent)\.location\b|window\.top\.location/, "frame_navigation"],
  [/\b(eval|Function)\s*\(\s*(atob|unescape|decodeURIComponent)\s*\(/, "obfuscated_eval"],
  [/<input[^>]+type\s*=\s*["']?password/i, "password_field"],
  [/<form[^>]+action\s*=\s*["']https?:\/\//i, "external_form"],
  [/navigator\.credentials|PaymentRequest\s*\(/, "credentials_or_payment_api"],
];

/**
 * Validate a developer zip and extract it to `destDir`.
 * Throws ZipError for anything we refuse to host.
 */
export async function extractGameZip(zipPath: string, destDir: string, projectDir?:string) {
  const entries = await listEntries(zipPath);
  if (entries.length === 0) throw new ZipError("zip_empty");
  const project=await detectProject(zipPath,entries);
  const root=project.root;
  const privateRoot=projectDir??destDir;
  const projectExt=new Set(["ts","tsx","jsx","vue","svelte","yaml","yml","toml","sh","sql"]);

  const files: { path: string; size: number }[] = [];
  const badExt = new Set<string>();
  let selectedBytes=0;
  const dropped:string[]=[];
  for (const e of entries) {
    if (!e.name.startsWith(root)) continue;
    const rel = e.name.slice(root.length);
    const ext = extOf(rel);
    const base = (rel.split("/").pop() ?? "").toLowerCase();
    if (base.startsWith(".")) continue; // dotfiles are dropped
    if (ext ? (!allowedExt.has(ext) && !(projectDir && projectExt.has(ext))) : !allowedBare.has(base.replace(/\.(md|txt)$/, ""))) {
      if(project.publicRoot!==null&&!e.name.startsWith(project.publicRoot)){dropped.push(rel);continue;}
      badExt.add(ext ? `.${ext}` : base);
      continue;
    }
    selectedBytes+=e.size;if(selectedBytes>MAX_TOTAL_BYTES)throw new ZipError("zip_too_large");if(files.length>=MAX_FILES)throw new ZipError("zip_too_many_files");
    files.push({ path: rel, size: e.size });
  }
  if (badExt.size) throw new ZipError("zip_bad_files", [...badExt].slice(0, 10).join(", "));

  const wanted = new Map(files.map((f) => [root + f.path, f.path]));
  const tmpDir = `${privateRoot}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(tmpDir, { recursive: true });

  const hosts = new Set<string>();
  const warnings = new Set<string>(dropped.slice(0,20).map(name=>`unused_file_skipped:${name}`));
  let totalBytes = 0;

  const zip = await openZip(zipPath);
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("entry", (e: yauzl.Entry) => {
        const rel = safeRelative(e.fileName);
        const target = rel !== null ? wanted.get(rel) : undefined;
        if (!target || e.fileName.endsWith("/")) return zip.readEntry();
        const outPath = path.join(tmpDir, target);
        if (!outPath.startsWith(tmpDir + path.sep)) return reject(new ZipError("zip_unsafe_path", e.fileName));
        zip.openReadStream(e, async (err, stream) => {
          if (err || !stream) return reject(new ZipError("zip_invalid", err?.message));
          try {
            await fs.mkdir(path.dirname(outPath), { recursive: true });
            const scan = (textExt.has(extOf(target))||projectExt.has(extOf(target))) && e.uncompressedSize <= 3 * 1024 * 1024;
            if (textExt.has(extOf(target)) && !scan) warnings.add(`not_scanned_large_text:${target}`);
            if (["wasm","bin","unityweb"].includes(extOf(target))) warnings.add(`binary_requires_review:${target}`);
            const chunks: Buffer[] = [];
            const counter = new Transform({
              transform(chunk: Buffer, _enc, cb) {
                totalBytes += chunk.length;
                if (totalBytes > MAX_TOTAL_BYTES) return cb(new ZipError("zip_too_large"));
                if (scan) chunks.push(chunk);
                cb(null, chunk);
              },
            });
            await pipeline(stream, counter, createWriteStream(outPath, { flags: "wx" }));
            if (scan) {
              const text = Buffer.concat(chunks).toString("utf8");
              for (const m of text.matchAll(/(?:https?:)?\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[/:"'`\s)?#]|$)/gi)) {
                const h = m[1].toLowerCase();
                if (!ignoredHosts.has(h) && /\.[a-z]{2,}$/.test(h)) hosts.add(h);
              }
              for (const [re, code] of suspicious) if (re.test(text)) warnings.add(`${code}:${target}`);
            }
            zip.readEntry();
          } catch (e2) {
            reject(e2 instanceof ZipError ? e2 : new ZipError("zip_invalid", String(e2)));
          }
        });
      });
      zip.on("end", resolve);
      zip.on("error", (err) => reject(new ZipError("zip_invalid", String(err))));
      zip.readEntry();
    });
    await fs.rm(privateRoot,{recursive:true,force:true});await fs.rename(tmpDir,privateRoot);
    if(projectDir){
      await fs.rm(destDir,{recursive:true,force:true});await fs.mkdir(destDir,{recursive:true});
      if(project.publicRoot!==null){
        const output=project.publicRoot.slice(root.length);
        const runtime=files.filter(f=>f.path.startsWith(output)).map(f=>({...f,path:f.path.slice(output.length)}));
        for(const file of runtime){if(!allowedExt.has(extOf(file.path))&&!allowedBare.has(file.path.toLowerCase()))throw new ZipError("zip_bad_files",file.path);const target=path.join(destDir,file.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(privateRoot,output,file.path),target);}
      }
    }
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw err;
  } finally {
    zip.close();
  }

  const entry=project.publicRoot===null?"":projectDir?project.entryName:files.find(f=>f.path===project.publicRoot!.slice(root.length)+"index.html")!.path;
  if(project.publicRoot===null)warnings.add(project.kind==="node-source"?"node_runtime_required":"frontend_build_required");
  for(const script of project.scripts)warnings.add(`project_script:${script}`);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const report: ScanReport = {
    fileCount: files.length,
    totalBytes,
    entry,
    externalHosts: [...hosts].sort().slice(0, 100),
    warnings: [...warnings].slice(0, 100),
    project:{...project,ignoredFiles:(entries as Entry[] & {ignoredCount?:number}).ignoredCount??0,requiresBuild:project.publicRoot===null},
  };
  const output=project.publicRoot?.slice(root.length);
  const runtimeFiles=output!==undefined?files.filter(f=>f.path.startsWith(output)).map(f=>({...f,path:f.path.slice(output.length)})):[];
  return {files,report,entry,runtimeKind:project.kind,runtimeFiles};
}
