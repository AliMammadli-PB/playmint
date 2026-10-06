"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, localeCookie, type Locale } from "@/lib/i18n/config";

export function LangSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale;
          document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
          const parts = pathname.split("/");
          parts[1] = next;
          router.push(parts.join("/") + window.location.search);
        }}
        className="w-[4.25rem] cursor-pointer appearance-none truncate rounded-full sm:w-auto border border-line-strong bg-transparent py-1.5 pl-3 pr-7 text-xs font-semibold uppercase text-muted hover:text-paper focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-surface text-paper">
            {l.toUpperCase()} · {localeNames[l]}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 h-3 w-3 text-muted" viewBox="0 0 12 12" aria-hidden>
        <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </label>
  );
}
