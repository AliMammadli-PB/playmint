import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

export async function Header({ locale, t }: { locale: Locale; t: Dict }) {
  const user = await getCurrentUser();
  const L = (p: string) => `/${locale}${p}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-xl">
      <div className="container-pm flex h-16 items-center gap-4">
        <Link href={L("")} className="shrink-0" aria-label="Playmint">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
          <Link href={L("/games")} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-paper">
            {t.nav.games}
          </Link>
          <Link href={L("/premium")} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-paper">
            <span className="text-amber">★</span> {t.nav.premium}
          </Link>
          <Link href={L("/developers")} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-paper">
            {t.nav.developers}
          </Link>
        </nav>
        <form action={L("/games")} className="ml-auto hidden max-w-xs flex-1 sm:block">
          <input name="q" type="search" placeholder={t.nav.search} className="input rounded-full py-2" />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <LangSwitcher locale={locale} label={t.nav.language} />
          {user ? (
            <details className="group relative">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-surface-3 text-sm font-bold uppercase text-mint ring-1 ring-line-strong hover:ring-mint/60 [&::-webkit-details-marker]:hidden">
                {user.name.slice(0, 1)}
              </summary>
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line-strong bg-surface p-1.5 shadow-2xl shadow-black/50">
                <div className="px-3 py-2 text-xs text-muted">
                  <div className="truncate font-semibold text-paper">{user.name}</div>
                  <div className="truncate">{user.email}</div>
                </div>
                <MenuLink href={L("/me")}>{t.nav.profile}</MenuLink>
                {(user.role === "developer" || user.role === "admin") && <MenuLink href={L("/dev")}>{t.nav.devPanel}</MenuLink>}
                {user.role === "admin" && <MenuLink href={L("/admin")}>{t.nav.admin}</MenuLink>}
                <form action={logoutAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-paper">
                    {t.nav.logout}
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href={L("/login")} className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-paper sm:inline">
                {t.nav.login}
              </Link>
              <Link href={L("/register")} className="btn btn-primary btn-sm whitespace-nowrap">
                {t.nav.register}
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="container-pm flex gap-1 overflow-x-auto pb-2 text-sm font-medium text-muted no-scrollbar md:hidden">
        <Link href={L("/games")} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5">{t.nav.games}</Link>
        <Link href={L("/premium")} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5"><span className="text-amber">★</span> {t.nav.premium}</Link>
        <Link href={L("/developers")} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5">{t.nav.developers}</Link>
      </nav>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-xl px-3 py-2 text-sm text-paper hover:bg-surface-2">
      {children}
    </Link>
  );
}
