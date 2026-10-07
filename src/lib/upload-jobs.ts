import "server-only";
import {and,eq,ne,sql} from "drizzle-orm";
import {scanVersion} from "@/lib/virustotal";
import {archiveHash} from "@/lib/archive-hash";
import {db,schema} from "@/lib/db";
import {createVersion} from "@/lib/versions";
import {archivePath,getUpload,writeUpload,uploadLock,removeUploadArchive,processAlive} from "@/lib/upload-store";
import {getDict} from "@/lib/i18n";
import {fill} from "@/lib/i18n/text";
import {newId} from "@/lib/ids";
import {audit} from "@/lib/audit";
export async function processUpload(id:string,owner:string){try{await uploadLock(id,async()=>{const record=await getUpload(id,owner);if(!record.job||record.status==='done'||record.status==='failed')return;if(record.status==='processing'&&processAlive(record.pid)&&record.pid!==process.pid)return;record.status='processing';record.pid=process.pid;record.versionId=record.versionId??newId();await writeUpload(record);let heartbeat=Promise.resolve();const touch=setInterval(()=>{heartbeat=heartbeat.then(()=>writeUpload(record)).catch(()=>{});},30000);try{const user=(await db.select().from(schema.users).where(eq(schema.users.id,owner)))[0];const game=(await db.select().from(schema.games).where(eq(schema.games.id,record.job.gameId)))[0];if(!user||user.banned||!game||(game.developerId!==owner&&user.role!=="admin"))throw new Error("forbidden");const hash=await archiveHash(archivePath(id));
const create=()=>createVersion(record.job!.gameId,{archivePath:archivePath(id),size:record.total,versionId:record.versionId,archiveSha256:hash},record.job!.changelog,record.job!.maxZipMb);
if(record.job.isNew){
 await db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${owner+":"+game.title}))`);
  const existing=(await tx.select({version:schema.gameVersions.id,game:schema.games.id}).from(schema.gameVersions).innerJoin(schema.games,eq(schema.games.id,schema.gameVersions.gameId)).where(and(eq(schema.games.developerId,owner),eq(schema.games.title,game.title),ne(schema.games.id,game.id),ne(schema.games.status,"removed"),sql`${schema.gameVersions.report}->>'archiveSha256' = ${hash}`,sql`${schema.gameVersions.status} in ('pending','approved')`)).limit(1))[0];
  if(existing){await tx.delete(schema.games).where(eq(schema.games.id,game.id));record.job!.gameId=existing.game;record.job!.reused=true;record.versionId=existing.version;}
  else record.versionId=await create();
 });
}else record.versionId=await create();await scanVersion(record.versionId).catch(()=>{});record.status='done';await audit(owner,'version.upload',record.versionId,{gameId:record.job.gameId});await removeUploadArchive(id);}catch(e){record.status='failed';const code=e instanceof Error?(e as Error&{code?:string}).code:undefined;const dict=getDict(record.job.locale);record.error=fill((dict.dev.errors as Record<string,string>)[code??'']??dict.common.error,{detail:(e as {detail?:string}).detail??''});if(record.job.isNew&&!record.job.reused)await db.delete(schema.games).where(eq(schema.games.id,record.job.gameId));await removeUploadArchive(id);}finally{clearInterval(touch);await heartbeat;delete record.pid;await writeUpload(record);}});}catch(e){if(e instanceof Error&&e.message==='busy')return;console.error('upload job failed',e instanceof Error?e.message:'unknown');}}
