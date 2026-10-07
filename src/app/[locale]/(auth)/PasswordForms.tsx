"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction, type ForgotState } from "./actions";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function ForgotForm({ locale, emailLabel, submit }: { locale: string; emailLabel: string; submit: string }) {
  const [state, action] = useActionState<ForgotState, FormData>(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="email">{emailLabel}</label>
        <input id="email" name="email" type="email" required defaultValue={state?.email} className="input" autoComplete="email" />
      </div>
      <FormSuccess message={state?.notice} />
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full">{submit}</SubmitButton>
    </form>
  );
}

export function ResetForm({ locale, token, passwordLabel, confirmLabel, submit }: { locale: string; token: string; passwordLabel: string; confirmLabel: string; submit: string }) {
  const [state, action] = useActionState<ForgotState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">{passwordLabel}</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={128} className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="passwordConfirm">{confirmLabel}</label>
        <input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} maxLength={128} className="input" autoComplete="new-password" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full">{submit}</SubmitButton>
    </form>
  );
}
