"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PanelNav({ items, root }: { items: { href: string; label: string; badge?: number }[]; root: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
      {items.map((it) => {
        const active = it.href === root ? pathname === root : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              active ? "bg-mint/12 text-mint" : "text-muted hover:bg-surface-2 hover:text-paper"
            }`}
          >
            <span>{it.label}</span>
            {it.badge ? <span className="rounded-full bg-amber px-1.5 text-[11px] font-bold text-ink">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
