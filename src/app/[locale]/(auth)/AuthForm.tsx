"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "./actions";
import { FormError, SubmitButton } from "@/components/ui";

type Labels = {
  title: string;
  subtitle?: string;
  email: string;
  password: string;
  name: string;
  submit: string;
  switchText: string;
  switchLink: string;
};

export function AuthForm({ mode, locale, next, labels }: { mode: "login" | "register"; locale: string; next?: string; labels: Labels }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, null);
  const other = mode === "login" ? "register" : "login";
  return (
    <div className="container-pm flex justify-center py-16">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <h1 className="h1 text-2xl sm:text-3xl">{labels.title}</h1>
        {labels.subtitle && <p className="mt-2 text-sm text-muted">{labels.subtitle}</p>}
        <form action={action} className="mt-7 space-y-4">
          <input type="hidden" name="locale" value={locale} />
          {next && <input type="hidden" name="next" value={next} />}
          {mode === "register" && (
            <div>
              <label className="label" htmlFor="name">{labels.name}</label>
              <input id="name" name="name" required maxLength={60} defaultValue={state?.name} className="input" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">{labels.email}</label>
            <input id="email" name="email" type="email" required defaultValue={state?.email} className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">{labels.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              className="input"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <FormError message={state?.error} />
          <SubmitButton className="btn btn-primary w-full">{labels.submit}</SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {labels.switchText}{" "}
          <Link href={`/${locale}/${other}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-mint hover:underline">
            {labels.switchLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
