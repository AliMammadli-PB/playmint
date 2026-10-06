import { eq, sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { PanelNav } from "@/components/PanelNav";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale, t } = await resolveLocale(params);
  await requireAdmin(locale);
  const [{ n: pending }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.gameVersions)
    .where(eq(schema.gameVersions.status, "pending"));
  const [{ n: payouts }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.payouts)
    .where(eq(schema.payouts.status, "requested"));
  const base = `/${locale}/admin`;
  return (
    <div className="container-pm grid gap-6 py-8 lg:grid-cols-[210px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden px-3.5 text-xs font-semibold uppercase tracking-widest text-faint lg:block">{t.nav.admin}</div>
        <PanelNav
          root={base}
          items={[
            { href: base, label: t.admin.nav.overview },
            { href: `${base}/review`, label: t.admin.nav.review, badge: pending },
            { href: `${base}/games`, label: t.admin.nav.games },
            { href: `${base}/users`, label: t.admin.nav.users },
            { href: `${base}/finance`, label: t.admin.nav.finance, badge: payouts },
            { href: `${base}/settings`, label: t.admin.nav.settings },
          ]}
        />
      </aside>
      <div className="min-w-0 space-y-4">
        {!env.gameOrigin && (
          <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-2.5 text-xs text-amber">{t.admin.gameOriginWarn}</div>
        )}
        {children}
      </div>
    </div>
  );
}
