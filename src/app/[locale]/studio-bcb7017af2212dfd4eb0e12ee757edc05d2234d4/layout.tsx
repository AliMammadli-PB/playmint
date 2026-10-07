export const metadata = {robots:{index:false,follow:false}};
import { eq, sql } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { PanelNav } from "@/components/PanelNav";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4">) {
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
  const [{ n: legacyPending }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.gameVersions)
    .where(sql`${schema.gameVersions.status} = 'pending' and ${schema.gameVersions.report}->'legacyFlash' is not null`);
  const base = `/${locale}/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4`;
  return (
    <div className="admin-shell container-pm grid grid-cols-1 gap-6 py-8 lg:grid-cols-[210px_1fr]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden px-3.5 text-xs font-semibold uppercase tracking-widest text-faint lg:block">{t.nav.admin}</div>
        <PanelNav
          root={base}
          items={[
            { href: base, label: t.admin.nav.overview },
            { href: `${base}/review`, label: t.admin.nav.review, badge: pending },
            { href: `${base}/legacy`, label: locale === "en" ? "Legacy imports" : locale === "az" ? "Köhnə Flash" : "Eski Flash", badge: legacyPending },
            { href: `${base}/games`, label: t.admin.nav.games },
            { href: `${base}/users`, label: t.admin.nav.users },
            { href: `${base}/ads`, label:locale==="en"?"Ad revenue":locale === "az" ? "Reklam gəlirləri" : "Reklam gelirleri" },
            { href: `${base}/finance`, label: t.admin.nav.finance, badge: payouts },
            { href: `${base}/requests`, label: locale==="en"?"Contact / reports":locale==="az"?"Əlaqə / bildirişlər":"İletişim / bildirimler" },
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
