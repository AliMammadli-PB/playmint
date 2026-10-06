"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || rest.disabled}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        rest.onClick?.(e);
      }}
    >
      {pending && pendingText ? pendingText : children}
      {pending && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{message}</p>;
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl border border-mint/30 bg-mint/10 px-3.5 py-2.5 text-sm text-mint">{message}</p>;
}
