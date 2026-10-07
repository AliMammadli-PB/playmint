"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, localeCookie, type Locale } from "@/lib/i18n/config";
import { LangFlag } from "./LangFlag";

export function LangSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);

  function change(next: Locale) {
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    const parts = pathname.split("/");
    parts[1] = next;
    if (menu.current) menu.current.open = false;
    router.push(parts.join("/") + window.location.search);
  }

  // Close on outside pointer — not onBlur. Touch devices often have
  // relatedTarget=null on blur, which closed the menu before the option click fired.
  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    function onPointerDown(e: PointerEvent) {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details
      ref={menu}
      className="language-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`${label}: ${locale.toUpperCase()} — ${localeNames[locale]}`} className="language-trigger">
        <LangFlag locale={locale} />
        <span>{locale.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m3 4 3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <div className="language-options">
        {locales.map((l) => (
          <button
            type="button"
            key={l}
            lang={l}
            aria-label={localeNames[l]}
            aria-current={locale === l ? "true" : undefined}
            onPointerDown={(e) => {
              // Fire before any focus change so taps select even when blur would race.
              if (e.button !== 0) return;
              e.preventDefault();
              change(l);
            }}
            onClick={(e) => {
              // Keyboard Enter/Space (detail===0); pointer path already handled above.
              if (e.detail === 0) change(l);
            }}
          >
            <LangFlag locale={l} />
            {localeNames[l]}
            {locale === l && <span className="language-check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
