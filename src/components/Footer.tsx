import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { Logo } from "./Logo";

export function Footer({ locale, t }: { locale: Locale; t: Dict }) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-pm flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm">{t.footer.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href={`/${locale}/games`} className="hover:text-paper">{t.nav.games}</Link>
          <Link href={`/${locale}/developers`} className="hover:text-paper">{t.footer.forDevs}</Link>
          <Link href={`/${locale}/developers#model`} className="hover:text-paper">{t.footer.howEarn}</Link>
        </div>
      </div>
      <div className="container-pm pb-8 text-xs text-faint">
        © {new Date().getFullYear()} Playmint · {t.footer.rights}
      </div>
    </footer>
  );
}
