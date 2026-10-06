"use client";

import { useActionState } from "react";
import { saveDevSettingsAction, type DevSettingsState } from "../actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

type L = Record<"profileSection" | "displayName" | "bio" | "website" | "payoutSection" | "payoutMethod" | "payoutName" | "payoutDetails" | "save" | "saved", string>;

export function SettingsForm({
  locale,
  labels,
  methods,
  defaults,
}: {
  locale: string;
  labels: L;
  methods: { value: string; label: string }[];
  defaults: { displayName: string; bio: string; website: string; payoutMethod: string; payoutName: string; payoutDetails: string; handle: string };
}) {
  const [state, action] = useActionState<DevSettingsState, FormData>(saveDevSettingsAction, null);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <div className="card space-y-4 p-5">
        <h2 className="font-display font-bold">{labels.profileSection} <span className="font-mono text-sm text-faint">@{defaults.handle}</span></h2>
        <div>
          <label className="label" htmlFor="displayName">{labels.displayName}</label>
          <input id="displayName" name="displayName" required maxLength={60} defaultValue={defaults.displayName} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="bio">{labels.bio}</label>
          <textarea id="bio" name="bio" rows={3} maxLength={1000} defaultValue={defaults.bio} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="website">{labels.website}</label>
          <input id="website" name="website" maxLength={200} defaultValue={defaults.website} className="input" placeholder="https://" />
        </div>
      </div>
      <div className="card space-y-4 p-5">
        <h2 className="font-display font-bold">{labels.payoutSection}</h2>
        <div>
          <label className="label" htmlFor="payoutMethod">{labels.payoutMethod}</label>
          <select id="payoutMethod" name="payoutMethod" defaultValue={defaults.payoutMethod} className="input">
            <option value="">—</option>
            {methods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="payoutName">{labels.payoutName}</label>
          <input id="payoutName" name="payoutName" maxLength={100} defaultValue={defaults.payoutName} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="payoutDetails">{labels.payoutDetails}</label>
          <input id="payoutDetails" name="payoutDetails" maxLength={200} defaultValue={defaults.payoutDetails} className="input font-mono" />
        </div>
      </div>
      <FormError message={state?.error} />
      {state?.ok && <FormSuccess message={labels.saved} />}
      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
