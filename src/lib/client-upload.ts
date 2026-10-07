"use client";

// This module outlives the upload page during client navigation, including locale changes.
export type UploadState = {progress:number|null;error:string|null;done:boolean;filename?:string;title?:string;fields?:Record<string,string>;data?:Record<string,unknown>};
const idle:UploadState={progress:null,error:null,done:false};
const states=new Map<string,UploadState>(),listeners=new Set<()=>void>();
export const uploadState=(endpoint:string)=>states.get(endpoint)??idle;
export const serverUploadState=()=>idle;
export function subscribeUploads(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function update(endpoint:string,value:Partial<UploadState>){states.set(endpoint,{...uploadState(endpoint),...value});for(const fn of listeners)fn();}
export function clearUpload(endpoint:string){states.delete(endpoint);for(const fn of listeners)fn();}
export async function startUpload(endpoint:string,form:FormData,labels:{error:string;tooBig?:string}){
 const current=uploadState(endpoint);if(current.progress!==null&&!current.error)return;
 const file=form.get('zip');update(endpoint,{progress:0,error:null,done:false,data:undefined,filename:file instanceof File?file.name:'',title:String(form.get('title')??''),fields:Object.fromEntries([...form.entries()].filter(([,v])=>typeof v==='string')) as Record<string,string>});
 const send=(url:string,body:XMLHttpRequestBodyInit,track?:(bytes:number)=>void)=>new Promise<Record<string,unknown>>((resolve,reject)=>{
  const xhr=new XMLHttpRequest();xhr.open('POST',url);xhr.timeout=180000;
  if(track)xhr.upload.onprogress=ev=>track(ev.loaded);
  xhr.onload=()=>{let data:Record<string,unknown>={};try{data=JSON.parse(xhr.responseText);}catch{}if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(xhr.status===413?labels.tooBig||labels.error:typeof data.error==='string'?data.error:labels.error));};
  xhr.onerror=xhr.ontimeout=()=>reject(new Error(labels.error));xhr.send(body);
 });
 let uploadId:string|null=null;
 try{
  if(!(file instanceof File)||!file.size)throw new Error(labels.error);
  const init=await fetch('/api/uploads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({filename:file.name,size:file.size})});
  const upload=await init.json();if(!init.ok)throw new Error(upload.error==='file_too_big'?labels.tooBig||labels.error:labels.error);uploadId=upload.id;
  for(let index=0,offset=0;offset<file.size;index++){
   const chunk=file.slice(offset,Math.min(offset+upload.chunkSize,file.size));
   for(let attempt=0;attempt<3;attempt++){try{await send(`/api/uploads/${upload.id}/chunks?index=${index}`,chunk,n=>update(endpoint,{progress:Math.max(uploadState(endpoint).progress??0,Math.min(99,Math.floor((offset+n)/file.size*100)))}));break;}catch(err){if(attempt===2)throw err;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}}
   offset+=chunk.size;update(endpoint,{progress:Math.min(99,Math.floor(offset/file.size*100))});
  }
  form.delete('zip');form.set('uploadId',upload.id);update(endpoint,{progress:100});
  let data=await send(endpoint,form);
  if(data.pending){const deadline=Date.now()+15*60_000;while(Date.now()<deadline){const response=await fetch(`/api/uploads/${upload.id}`,{cache:'no-store'});const status=await response.json();if(!response.ok)throw new Error(labels.error);if(status.status==='failed')throw new Error(status.error||labels.error);if(status.status==='done'){data={...data,...status};break;}await new Promise(r=>setTimeout(r,1500));}if(data.status!=='done')throw new Error(labels.error);}
  update(endpoint,{done:true,data});
 }catch(err){if(uploadId)fetch(`/api/uploads/${uploadId}`,{method:'DELETE'}).catch(()=>{});update(endpoint,{error:err instanceof Error?err.message:labels.error,progress:null});}
}
