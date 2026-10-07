"use client";

import { useActionState, useEffect, useState } from "react";
import { saveDevSettingsAction, saveIbanAction, type DevSettingsState } from "../actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

type L = Record<"profileSection" | "displayName" | "bio" | "website" | "payoutSection" | "payoutMethod" | "payoutName" | "payoutDetails" | "save" | "saved", string>;

function formatIban(value: string) {
  return value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

function maskIban(value: string) {
  const compact = value.replace(/\s/g, "").toUpperCase();
  if (compact.length < 8) return formatIban(compact);
  return `${compact.slice(0, 4)} •••• •••• •••• ${compact.slice(-4)}`;
}

export function SettingsForm({
  locale,
  labels,
  defaults,
}: {
  locale: string;
  labels: L;
  methods: { value: string; label: string }[];
  defaults: { displayName: string; bio: string; website: string; payoutMethod: string; payoutName: string; payoutDetails: string; handle: string };
}) {
  const [profileState, profileAction] = useActionState<DevSettingsState, FormData>(saveDevSettingsAction, null);
  const [ibanState, ibanAction] = useActionState<DevSettingsState, FormData>(saveIbanAction, null);
  const savedIban = defaults.payoutMethod === "iban" && defaults.payoutDetails ? defaults.payoutDetails : "";
  const [editing, setEditing] = useState(!savedIban);
  const en = locale === "en";
  const az = locale === "az";
  const copy = {
    hint: en ? "Bank transfer to a Turkish IBAN. Minimum withdrawal is ₺1,000." : az ? "Türkiyə IBAN-ına bank köçürməsi. Minimum çıxarış 1.000 TL." : "Türkiye IBAN’ına banka havalesi. Minimum çekim 1.000 TL.",
    savedAs: en ? "Saved IBAN" : az ? "Saxlanan IBAN" : "Kayıtlı IBAN",
    change: en ? "Change IBAN" : az ? "IBAN-ı dəyiş" : "IBAN’ı değiştir",
    cancel: en ? "Cancel" : az ? "Ləğv et" : "Vazgeç",
    saveIban: en ? "Save IBAN" : az ? "IBAN-ı saxla" : "IBAN’ı kaydet",
  };

  useEffect(() => {
    if (ibanState?.ok) setEditing(false);
  }, [ibanState]);

  return (
    <div className="space-y-6">
      <form action={profileAction} className="card space-y-4 p-5">
        <input type="hidden" name="locale" value={locale} />
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
        <FormError message={profileState?.error} />
        {profileState?.ok && <FormSuccess message={labels.saved} />}
        <SubmitButton>{labels.save}</SubmitButton>
      </form>

      <form key={savedIban} action={ibanAction} className="card space-y-4 p-5">
        <input type="hidden" name="locale" value={locale} />
        <h2 className="font-display font-bold">{labels.payoutSection}</h2>
        <p className="text-sm text-muted">{copy.hint}</p>
        {savedIban && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <div>
              <p className="text-xs text-faint">{copy.savedAs}</p>
              <p className="font-mono text-sm">{maskIban(savedIban)}</p>
              {defaults.payoutName && <p className="text-sm text-muted">{defaults.payoutName}</p>}
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>{copy.change}</button>
          </div>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="payoutName">{labels.payoutName}</label>
              <input id="payoutName" name="payoutName" required maxLength={100} defaultValue={defaults.payoutName} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="payoutDetails">{labels.payoutDetails}</label>
              <input id="payoutDetails" name="payoutDetails" required maxLength={42} placeholder="TR00 0000 0000 0000 0000 0000 00" defaultValue={savedIban ? formatIban(savedIban) : ""} className="input font-mono" autoComplete="off" spellCheck={false} />
            </div>
            <div className="flex flex-wrap gap-2">
              <SubmitButton>{copy.saveIban}</SubmitButton>
              {savedIban && <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>{copy.cancel}</button>}
            </div>
          </>
        )}
        <FormError message={ibanState?.error} />
        {ibanState?.ok && <FormSuccess message={labels.saved} />}
      </form>
    </div>
  );
}
