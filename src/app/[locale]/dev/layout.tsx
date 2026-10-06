import { resolveLocale } from "@/lib/i18n";
import { requireDeveloper } from "@/lib/auth";
import { PanelNav } from "@/components/PanelNav";

export default async function DevLayout({ children, params }: LayoutProps<"/[locale]/dev">) {
  const { locale, t } = await resolveLocale(params);
  await requireDeveloper(locale);
  const base = `/${locale}/dev`;
  return (
    <div className="container-pm grid gap-6 py-8 lg:grid-cols-[210px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden px-3.5 text-xs font-semibold uppercase tracking-widest text-faint lg:block">{t.nav.devPanel}</div>
        <PanelNav
          root={base}
          items={[
            { href: base, label: t.dev.nav.overview },
            { href: `${base}/games`, label: t.dev.nav.games },
            { href: `${base}/earnings`, label: t.dev.nav.earnings },
            { href: `${base}/settings`, label: t.dev.nav.settings },
          ]}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
