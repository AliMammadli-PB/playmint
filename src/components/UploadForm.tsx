"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  labels: { uploading: string; processing: string; submitted: string; error: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      let data: Record<string, string> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        setDone(true);
        router.push(redirectTo.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(data[k] ?? "")));
        router.refresh();
      } else {
        setError(data.error || labels.error);
        setProgress(null);
      }
    };
    xhr.onerror = () => {
      setError(labels.error);
      setProgress(null);
    };
    setProgress(0);
    xhr.send(new FormData(e.currentTarget));
  }

  const busy = progress !== null && !error;
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy || done} className="space-y-5">
        {children}
      </fieldset>
      <FormError message={error} />
      {done && <FormSuccess message={labels.submitted} />}
      {busy && !done && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
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
