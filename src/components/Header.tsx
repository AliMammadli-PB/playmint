import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

export async function Header({ locale, t }: { locale: Locale; t: Dict }) {
  const user = await getCurrentUser();
  const isDev=user?.role==="developer"||user?.role==="admin";
  const L = (p: string) => `/${locale}${p}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-xl">
      <div className="container-pm flex h-16 items-center gap-4">
        <Link href={L("")} className="shrink-0" aria-label="Playmint">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-muted md:flex">
          <Link href={L(isDev?"/dev/games":"/games")} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-paper">
            {isDev?(locale==="en"?"My games":locale==="az"?"Oyunlarım":"Oyunlarım"):t.nav.games}
          </Link>
          <Link href={L(isDev?"/dev":"/developers")} className="rounded-full px-3 py-1.5 hover:bg-surface-2 hover:text-paper">
            {isDev?(locale==="en"?"Studio":"Stüdyo"):t.nav.developers}
          </Link>
        </nav>
        <form action={L("/games")} className="ml-auto hidden max-w-xl flex-1 sm:block">
          <input name="q" type="search" placeholder={t.nav.search} className="input rounded-full py-2" aria-label={t.nav.search} />
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <LangSwitcher locale={locale} label={t.nav.language} />
          {isDev&&<Link href={L("/dev/notifications")} className="grid h-9 w-9 place-items-center rounded-full border border-line text-mint" aria-label={locale==="en"?"Notifications":locale==="az"?"Bildirişlər":"Bildirimler"}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 3 6 3 8H3c0-2 3-2 3-8Z"/><path d="M10 21h4"/></svg><span className="sr-only">{locale==="en"?"Notifications":"Bildirimler"}</span></Link>}
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
                {isDev && <MenuLink href={L("/dev/notifications")}>{locale==="en"?"Notifications":locale==="az"?"Bildirişlər":"Bildirimler"}</MenuLink>}
                {isDev && <MenuLink href={L("/dev/games")}>{locale==="en"?"My games":"Oyunlarım"}</MenuLink>}
                <MenuLink href={L(isDev?"/dev/settings":"/me")}>{t.nav.profile}</MenuLink>
                <MenuLink href={L(isDev?"/dev/account":"/me/settings")}>{locale==="en"?"Account settings":locale==="az"?"Hesab ayarları":"Hesap ayarları"}</MenuLink>
                {(user.role === "developer" || user.role === "admin") && <MenuLink href={L("/dev")}>{t.nav.devPanel}</MenuLink>}
                {user.role === "admin" && <MenuLink href={L("/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4")}>{t.nav.admin}</MenuLink>}
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
        <Link href={L(isDev?"/dev/games":"/games")} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5">{isDev?(locale==="en"?"My games":"Oyunlarım"):t.nav.games}</Link>
        <Link href={L("/developers")} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5">{t.nav.developers}</Link>
        <Link href={L("/games")} aria-label={t.nav.search} className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></Link>
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
