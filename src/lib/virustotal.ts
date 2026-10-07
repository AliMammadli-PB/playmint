import 'server-only';
import fs from 'node:fs/promises';
import {openAsBlob} from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {and,eq,inArray,sql} from 'drizzle-orm';
import {db,schema} from '@/lib/db';
import {paths} from '@/lib/env';
import {archiveHash} from '@/lib/archive-hash';
import {parseAnalysis,type VirusTotalReport} from './virustotal-result';
const execute=promisify(execFile),api='https://www.virustotal.com/api/v3';
const archive=(id:string)=>{if(!/^[a-z0-9]{20}$/.test(id))throw new Error('invalid_version');return path.join(paths.scans(),id+'.zip');};
export async function removeScanArchive(id:string){await fs.rm(archive(id),{force:true});}
export async function packRuntime(filesDir:string,destination:string){
 await fs.mkdir(path.dirname(destination),{recursive:true,mode:0o700});
 await execute('python3',['-c',`import os,sys,zipfile
root,target=sys.argv[1:]
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for current,dirs,files in os.walk(root):
  dirs.sort()
  for name in sorted(files):
   file=os.path.join(current,name)
   if os.path.islink(file): raise ValueError('symlink')
   z.write(file,os.path.relpath(file,root))
`,filesDir,destination],{timeout:120000,maxBuffer:8192});
 await fs.chmod(destination,0o600);
}
async function request(url:string,key:string,init:RequestInit={}){
 const response=await fetch(url,{...init,headers:{...init.headers,'x-apikey':key},redirect:'error',signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error(response.status===429?'quota_exceeded':response.status===401||response.status===403?'credential_or_access_error':`provider_http_${response.status}`);
 return response.json();
}
/** One bounded API operation per pass; the worker and admin panel continue submitted analyses. */
export async function scanVersion(id:string){
 return db.transaction(async tx=>{
  const lock=await tx.execute(sql`select pg_try_advisory_xact_lock(77182349) as locked`);if(!lock.rows[0]?.locked)return;
  const v=(await tx.select().from(schema.gameVersions).where(eq(schema.gameVersions.id,id)))[0];if(!v||!['pending','approved'].includes(v.status))return;
  const previous=v.report.virustotal;if(previous?.status==='completed')return;
  if(previous&&Date.now()-Date.parse(previous.updatedAt)<15000&&previous.status!=='not_configured')return;
  let result:VirusTotalReport={status:'pending',updatedAt:new Date().toISOString()};
  const key=process.env.VIRUSTOTAL_API_KEY;
  if(key&&v.runtimeKind==='browser'){
   const last=(await tx.select().from(schema.settings).where(eq(schema.settings.key,'vtLastPassAt')))[0];
   if(last&&typeof last.value==='number'&&Date.now()-last.value<30000)return;
   await tx.insert(schema.settings).values({key:'vtLastPassAt',value:Date.now()}).onConflictDoUpdate({target:schema.settings.key,set:{value:Date.now()}});
  }
  try{
   if(v.runtimeKind!=='browser'||!v.entry)result.status='runtime_missing';
   else if(!key)result.status='not_configured';
   else if(previous?.analysisId){const data=await request(`${api}/analyses/${encodeURIComponent(previous.analysisId)}`,key);result=parseAnalysis(data.data.attributes,previous);}
   else{
    const file=archive(id);await packRuntime(v.filesDir,file);const size=(await fs.stat(file)).size;
    if(size>650*1024*1024)throw new Error('scan_archive_too_large');
    const sha256=await archiveHash(file);result.sha256=sha256;
    let uploadUrl=api+'/files';if(size>32*1024*1024){const response=await request(api+'/files/upload_url',key);const url=new URL(response.data);if(url.protocol!=='https:'||!(url.hostname==='virustotal.com'||url.hostname.endsWith('.virustotal.com')))throw new Error('invalid_provider_upload_url');uploadUrl=url.href;}
    const form=new FormData();form.set('file',await openAsBlob(file),`${id}-dist.zip`);
    const uploaded=await request(uploadUrl,key,{method:'POST',body:form});if(typeof uploaded.data?.id!=='string')throw new Error('invalid_provider_response');
    result={...result,status:'submitted',analysisId:uploaded.data.id};
   }
  }catch(e){result={...previous,...result,status:'error',updatedAt:new Date().toISOString(),error:e instanceof Error&&/^(quota_exceeded|credential_or_access_error|provider_http_\d+|scan_archive_too_large|invalid_provider_\w+)$/.test(e.message)?e.message:'scan_failed'};}
  await tx.update(schema.gameVersions).set({report:sql`jsonb_set(${schema.gameVersions.report},'{virustotal}',${JSON.stringify(result)}::jsonb)`}).where(and(eq(schema.gameVersions.id,id),inArray(schema.gameVersions.status,['pending','approved'])));
  if(result.status==='completed'||result.status==='error')await removeScanArchive(id);
 });
}
