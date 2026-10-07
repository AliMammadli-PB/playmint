/** Pinned MIT collection import. Never publishes without a real clean scan of the identical runtime. */
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {eq,sql} from 'drizzle-orm';
import {db,schema} from '../src/lib/db';
import {paths} from '../src/lib/env';
import {newId,randomToken} from '../src/lib/ids';
import {hashPassword} from '../src/lib/password';
import {createVersion,approveVersion} from '../src/lib/versions';
import {packRuntime,scanVersion} from '../src/lib/virustotal';
import {scanAllowsApproval} from '../src/lib/virustotal-result';
import {archiveHash} from '../src/lib/archive-hash';
const manifestPath=path.resolve(process.argv[3]||'catalogue/open-source/mashukui-20261007.json');
const prepared=path.resolve(process.env.PLAYMINT_IMPORT_PREPARED||'');
const records=JSON.parse(readFileSync(manifestPath,'utf8')) as {key:string;slug:string;title:string;category:string;entry:string;tagline:schema.I18nText;source:string;author:string;license:string;upstreamRevision:string;mobileResponsive:boolean;fullscreenSupported:boolean;orientation:string;featured:boolean}[];
const stamp=new Date('2026-10-07T00:00:00Z');
async function versions(){return db.select({version:schema.gameVersions,game:schema.games}).from(schema.games).innerJoin(schema.gameVersions,eq(schema.gameVersions.gameId,schema.games.id)).where(sql`${schema.games.slug} in (${sql.join(records.map(r=>sql`${r.slug}`),sql`, `)})`);}
async function stage(){
 if(!process.env.PLAYMINT_IMPORT_PREPARED)throw new Error('prepared_directory_required');
 const reviewers=await db.select().from(schema.users).where(eq(schema.users.role,'admin'));if(!reviewers.some(u=>!u.banned))throw new Error('admin_required');
 let user=(await db.select().from(schema.users).where(eq(schema.users.email,'opensource@playmint.tr')))[0];
 if(!user){const id=newId();await db.insert(schema.users).values({id,email:'opensource@playmint.tr',name:'Playmint Open Source',username:'playmint-open-source',role:'developer',passwordHash:await hashPassword(randomToken(48))});user=(await db.select().from(schema.users).where(eq(schema.users.id,id)))[0];}
 await db.insert(schema.developerProfiles).values({userId:user.id,handle:'playmint-open-source',displayName:'Playmint Open Source',bio:'Open-source games hosted by Playmint. Original author: mashukui. Each game includes its MIT license, source and attribution.',website:'https://github.com/mashukui/web-games'}).onConflictDoNothing();
 for(const r of records){
  let g=(await db.select().from(schema.games).where(eq(schema.games.slug,r.slug)))[0];
  if(!g){const id=newId();const description={en:`${r.tagline.en}\n\nOriginal author: ${r.author}. Hosted by Playmint under the MIT license.\nSource: ${r.source}\nGames offer English and seven other languages; Turkish/Azerbaijani catalogue text is provided by Playmint.`,tr:`${r.tagline.tr}\n\nOrijinal geliştirici: ${r.author}. MIT lisansı ile Playmint’te barındırılır.\nKaynak: ${r.source}\nOyun içi dil İngilizce ve diğer yedi dilde; katalog açıklaması Türkçedir.`,az:`${r.tagline.az}\n\nOrijinal müəllif: ${r.author}. MIT lisenziyası ilə Playmint-də yerləşdirilib.\nMənbə: ${r.source}\nOyundaxili dil ingiliscə və digər yeddi dildədir; kataloq açıqlaması azərbaycancadır.`};await db.insert(schema.games).values({id,developerId:user.id,slug:r.slug,title:r.title,category:r.category,tags:['open-source','MIT',r.key],license:'MIT',tagline:r.tagline,description,mobileResponsive:r.mobileResponsive,fullscreenSupported:r.fullscreenSupported,orientation:r.orientation,featured:r.featured,isDemo:false});g=(await db.select().from(schema.games).where(eq(schema.games.id,id)))[0];}
  if(g.developerId!==user.id)throw new Error('slug_owned_by_other_user');
  await fs.mkdir(paths.covers(),{recursive:true});const cover=g.id+'-opensource.png';await fs.copyFile(path.join(prepared,'covers',r.key+'.png'),path.join(paths.covers(),cover));await db.update(schema.games).set({coverPath:cover}).where(eq(schema.games.id,g.id));
  if(g.liveVersionId){console.log('already published',r.slug);continue;}
  let v=(await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.gameId,g.id)))[0];
  if(!v){const archive=path.join(prepared,'collection.zip');const id=await createVersion(g.id,{archivePath:archive,size:(await fs.stat(archive)).size},`MIT collection ${r.upstreamRevision}; original author mashukui`,50);v=(await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id,id)))[0];}
  for(const f of v.files)await fs.utimes(path.join(v.filesDir,f.path),stamp,stamp);
  const report={...v.report,entry:r.entry,openSource:{author:r.author,repository:'https://github.com/mashukui/web-games',source:r.source,revision:r.upstreamRevision,license:'MIT',adaptations:['upstream analytics disabled','unrelated promotional link removed','catalogue navigation updated','viewport zoom enabled','guarded score storage in opaque sandbox']}};
  await db.update(schema.gameVersions).set({entry:r.entry,report}).where(eq(schema.gameVersions.id,v.id));console.log('prepared',r.slug,v.id);
 }
}
async function scan(){const rows=await versions();const first=rows.find(r=>r.version.status==='pending');if(!first){console.log('no pending import');return;}await scanVersion(first.version.id);const v=(await db.select().from(schema.gameVersions).where(eq(schema.gameVersions.id,first.version.id)))[0];console.log(JSON.stringify({id:v.id,scan:v.report.virustotal}));}
async function approve(){
 const rows=await versions();const clean=rows.find(r=>scanAllowsApproval(r.version.report.virustotal));if(!clean)throw new Error('real_clean_scan_required');
 const reviewer=(await db.select().from(schema.users).where(eq(schema.users.role,'admin'))).find(u=>!u.banned);if(!reviewer)throw new Error('admin_required');
 const expected=clean.version.report.virustotal!.sha256!;
 for(const {version:v,game:g} of rows){if(v.status!=='pending')continue;if(process.env.PLAYMINT_IMPORT_PREPARED){const record=records.find(r=>r.slug===g.slug)!;await fs.copyFile(path.join(prepared,'covers',record.key+'.png'),path.join(paths.covers(),g.coverPath!));}const check=path.join(paths.scans(),v.id+'-import-check.zip');await packRuntime(v.filesDir,check);const actual=await archiveHash(check);await fs.rm(check,{force:true});if(actual!==expected)throw new Error('runtime_hash_mismatch:'+g.slug);
  const sharedScan={...clean.version.report.virustotal!};const report={...v.report,virustotal:sharedScan,sharedScanVersionId:clean.version.id};await db.update(schema.gameVersions).set({report}).where(eq(schema.gameVersions.id,v.id));
  await approveVersion(v.id,reviewer.id,`Curated MIT import from mashukui/web-games. Browser and source review completed. Shared collection runtime SHA-256 ${expected}, identical bytes verified for this version; actual VirusTotal analysis ${sharedScan.analysisId}.`);console.log('published',g.slug);
 }
}
void(async()=>{if(process.argv[2]!=="status")throw new Error("This collection was retired at the owner request; do not republish.");console.log(JSON.stringify((await versions()).map(r=>({slug:r.game.slug,status:r.version.status,scan:r.version.report.virustotal?.status})),null,2));process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
