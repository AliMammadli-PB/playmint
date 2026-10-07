/** Deterministic fixtures for disposable CI databases only. Never runs on production. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {db,schema} from '../src/lib/db';
import {eq} from 'drizzle-orm';
import {paths} from '../src/lib/env';
async function main(){
 const url=new URL(process.env.DATABASE_URL||'');
 if(process.env.PLAYMINT_CI!=='1'||!['127.0.0.1','localhost'].includes(url.hostname)||!/^\/playmint_ci(?:_[a-z0-9]+)?$/.test(url.pathname))throw Error('ci_database_required');
 const root=path.resolve(process.env.DATA_DIR||'');
 if(!root.startsWith(path.resolve('test-results')+path.sep))throw Error('ci_storage_required');
 const admin='ciadmin0000000000001',owner='cideveloper000000001';
 for(const [id,name,role] of [[admin,'CI Review','admin'],[owner,'CI Studio','developer']] as const)await db.insert(schema.users).values({id,email:id+'@ci.invalid',username:id,name,role,passwordHash:'disabled:ci-fixture'}).onConflictDoNothing();
 await db.insert(schema.developerProfiles).values({userId:owner,handle:'ci-studio',displayName:'CI Studio',bio:'Automated test fixture.'}).onConflictDoNothing();
 const fixtures=[['pocket-ci','Pocket CI','strategy','game-worlds.png'],['runner-ci','Runner CI','arcade','arcade.webp'],['puzzle-ci','Puzzle CI','puzzle','puzzle.webp'],['racing-ci','Racing CI','racing','racing.webp'],['garden-ci','Garden CI','casual','logo.png']] as const;
 await fs.mkdir(paths.covers(),{recursive:true});
 for(const [i,[slug,title,category,art]] of fixtures.entries()){
  const id='cigame'+String(i).padStart(14,'0'),version='civersion'+String(i).padStart(11,'0'),dir=path.join(paths.games(),version),cover='ci-'+art;
  await fs.mkdir(dir,{recursive:true});await fs.copyFile(path.join('public','brand',art),path.join(paths.covers(),cover));
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title></head><body><canvas width="400" height="400"></canvas><script>const c=document.querySelector("canvas").getContext("2d");c.fillStyle="#70edb8";c.fillRect(0,0,400,400);</script></body></html>';
  await fs.writeFile(path.join(dir,'index.html'),html);
  const stamp=new Date('2026-01-01T00:00:00Z');
  await db.insert(schema.games).values({id,developerId:owner,slug,title,category,license:'MIT',tagline:{tr:title,en:title,az:title},status:'published',isDemo:false,featured:true,coverPath:cover,mobileResponsive:true,fullscreenSupported:true,orientation:'any',playCount:120+i*10,likeCount:30+i,publishedAt:stamp,createdAt:stamp}).onConflictDoNothing();
  // Fixed test review metadata, not a fabricated external scan or production approval.
  await db.insert(schema.gameVersions).values({id:version,gameId:id,number:1,status:'approved',sourceZipPath:path.join(root,version+'.zip'),filesDir:dir,entry:'index.html',runtimeKind:'browser',files:[{path:'index.html',size:Buffer.byteLength(html)}],report:{entry:'index.html',totalBytes:Buffer.byteLength(html),fileCount:1,externalHosts:[],warnings:['isolated_ci_fixture']},reviewedBy:admin,reviewedAt:stamp,createdAt:stamp}).onConflictDoNothing();
  await db.update(schema.games).set({liveVersionId:version}).where(eq(schema.games.id,id));
 }
 // Unapproved and removed entries prove that public filters exclude private data.
 for(const [id,slug,status] of [['ciprivate000000000001','private-ci','draft'],['ciremoved000000000001','removed-ci','removed']] as const)await db.insert(schema.games).values({id,developerId:owner,slug,title:'Private CI',category:'arcade',license:'MIT',status,isDemo:false}).onConflictDoNothing();
 console.log('CI fixtures ready: 5 reviewed games, 2 private games.');
}
void main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
