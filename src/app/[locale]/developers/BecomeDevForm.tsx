"use client";

import { useActionState } from "react";
import { becomeDeveloperAction, type BecomeDevState } from "./actions";
import { FormError, SubmitButton } from "@/components/ui";

export function BecomeDevForm({
  locale,
  defaultName,
  labels,
}: {
  locale: string;
  defaultName: string;
  labels: { handle: string; handleHint: string; displayName: string; accept: string; submit: string };
}) {
  const [state, action] = useActionState<BecomeDevState, FormData>(becomeDeveloperAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="displayName">{labels.displayName}</label>
        <input id="displayName" name="displayName" required maxLength={60} defaultValue={state?.displayName ?? defaultName} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="handle">{labels.handle}</label>
        <input id="handle" name="handle" required pattern="[a-z0-9][a-z0-9_\-]{1,28}[a-z0-9]" defaultValue={state?.handle} className="input font-mono" />
        <p className="hint">{labels.handleHint}</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="accept" required className="mt-0.5 h-4 w-4 accent-[#3dffb0]" />
        <span>{labels.accept}</span>
      </label>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full">{labels.submit}</SubmitButton>
    </form>
  );
}
