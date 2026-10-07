"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {uploadState,serverUploadState,subscribeUploads,startUpload,clearUpload} from "@/lib/client-upload";
import { FormError, FormSuccess } from "./ui";

/** Multipart form posted with XHR so we can show upload progress. */
export function UploadForm({
  endpoint,
  redirectTo,
  submitLabel,
  labels,
  children,
}: {
  endpoint: string;
  /** Path template; {key} placeholders are filled from the JSON response. */
  redirectTo: string;
  submitLabel: string;
  labels: { uploading: string; processing: string; submitted: string; error: string; tooBig?:string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const {progress,error,done,data,filename,title,fields} = useSyncExternalStore(subscribeUploads,()=>uploadState(endpoint),serverUploadState);
  useEffect(()=>{
    if(done&&data){
      const target=redirectTo.replace(/\{(\w+)\}/g,(_,k)=>encodeURIComponent(String(data[k]??"")));
      clearUpload(endpoint);router.push(target);router.refresh();
    }
  },[done,data,endpoint,redirectTo,router]);
  useEffect(()=>{
    const input=formRef.current?.querySelector<HTMLInputElement>('input[name="title"]');
    if(input&&title&&progress!==null)input.value=title;
    if(fields&&progress!==null)for(const node of formRef.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input[name],select[name],textarea[name]')??[]){if(node.name!=="locale"&&node.type!=="file"&&fields[node.name]!==undefined){if(node instanceof HTMLInputElement&&(node.type==="checkbox"||node.type==="radio"))node.checked=fields[node.name]===node.value;else node.value=fields[node.name];}}
  },[title,progress,fields]);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();void startUpload(endpoint,new FormData(e.currentTarget),labels);
  }

  const busy = progress !== null && !error;
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy || done} className="space-y-5">
        {children}
      </fieldset>
      {busy && filename && <p className="text-sm font-semibold text-mint">{filename}</p>}
      <FormError message={error} />
      {done && <FormSuccess message={labels.submitted} />}
      {busy && !done && (
        <div>
          <div role="progressbar" aria-valuenow={progress??0} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progress! < 100 ? labels.uploading.replace("{p}", String(progress)) : labels.processing}
          </p>
        </div>
      )}
      <button type="submit" disabled={busy || done} className="btn btn-primary w-full sm:w-auto">
        {submitLabel}
      </button>
    </form>
  );
}
