"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, localeCookie, type Locale } from "@/lib/i18n/config";
import { LangFlag } from "./LangFlag";

export function LangSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);

  function change(next: Locale) {
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax${window.location.protocol==="https:"?"; secure":""}`;
    const parts = pathname.split("/");
    parts[1] = next;
    setOpen(false);
    router.push(parts.join("/") + window.location.search + window.location.hash);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={root}
      className="language-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          root.current?.querySelector<HTMLButtonElement>(".language-trigger")?.focus();
        }
      }}
    >
      <button
        type="button"
        className="language-trigger"
        aria-label={`${label}: ${locale.toUpperCase()} — ${localeNames[locale]}`}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <LangFlag locale={locale} />
        <span>{locale.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m3 4 3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div id={listId} className="language-options" role="group" aria-label={label}>
          {locales.map((l) => (
            <button
              type="button"
              key={l}
              lang={l}
              aria-pressed={locale === l}
              aria-label={localeNames[l]}
              onClick={() => change(l)}
            >
              <LangFlag locale={l} />
              {localeNames[l]}
              {locale === l && (
                <span className="language-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
