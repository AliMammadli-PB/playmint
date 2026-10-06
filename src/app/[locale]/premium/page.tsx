import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/premium";
import { getSettings } from "@/lib/settings";
import { paymentProvider } from "@/lib/payments";
import { date, money } from "@/lib/format";
import { FormSuccess, SubmitButton } from "@/components/ui";
import Link from "next/link";
import { cancelAction, subscribeAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/premium">) {
  const { t } = await resolveLocale(params);
  return { title: t.premium.title };
}

export default async function PremiumPage({ params, searchParams }: PageProps<"/[locale]/premium">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const sub = user ? await getActiveSubscription(user.id) : null;
  const share = Math.round(s.devShareBps / 100);
  const vars = { share, platform: 100 - share };

  return (
    <div className="container-pm py-14">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-4xl text-amber">★</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t.premium.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t.premium.subtitle}</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-[1fr_1.1fr]">
        <div className="card relative overflow-hidden border-amber/30 p-7">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber/10 blur-3xl" />
          <div className="flex items-baseline gap-1">
            <span className="font-display text-5xl font-extrabold">{money(s.premiumPriceCents, s.currency, locale)}</span>
            <span className="text-muted">{t.premium.perMonth}</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {t.premium.benefits.map((b) => (
              <li key={b} className="flex gap-2.5">
                <span className="text-mint">✓</span>
                <span>{fill(b, vars)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 space-y-3">
            {sp.success && <FormSuccess message={t.premium.success} />}
            {!user ? (
              <Link href={`/${locale}/login?next=/${locale}/premium`} className="btn w-full bg-amber text-ink hover:bg-amber/90">
                {t.premium.loginFirst}
              </Link>
            ) : sub ? (
              <>
                <div className="rounded-xl border border-mint/30 bg-mint/10 p-3.5 text-sm">
                  <div className="font-semibold text-mint">✓ {t.premium.active}</div>
                  <div className="text-muted">{fill(t.premium.activeUntil, { date: date(sub.currentPeriodEnd, locale) })}</div>
                  {sub.cancelAtPeriodEnd && <div className="mt-1 text-xs text-amber">{t.premium.canceled}</div>}
                </div>
                <form action={subscribeAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <SubmitButton className="btn btn-ghost w-full">{t.premium.renew}</SubmitButton>
                </form>
                {!sub.cancelAtPeriodEnd && sub.provider !== "grant" && (
                  <form action={cancelAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <SubmitButton className="w-full text-center text-xs text-muted hover:text-danger">{t.premium.cancel}</SubmitButton>
                  </form>
                )}
              </>
            ) : (
              <form action={subscribeAction}>
                <input type="hidden" name="locale" value={locale} />
                <SubmitButton className="btn w-full bg-amber py-3 text-base text-ink hover:bg-amber/90">{t.premium.subscribe}</SubmitButton>
              </form>
            )}
            {paymentProvider.id === "mock" && <p className="text-center text-xs text-faint">🧪 {t.premium.testNotice}</p>}
          </div>
        </div>

        <div className="card p-7">
          <h2 className="h2 text-lg">{t.premium.howTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{fill(t.premium.howText, vars)}</p>
          <div className="mt-6 overflow-hidden rounded-xl border border-line">
            <div className="flex h-10 text-xs font-bold">
              <div className="flex items-center justify-center bg-mint text-ink" style={{ width: `${share}%` }}>
                {share}% dev
              </div>
              <div className="flex flex-1 items-center justify-center bg-surface-3 text-muted">{100 - share}%</div>
            </div>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            {[
              ["🎮", "A", 60],
              ["🧩", "B", 30],
              ["🏁", "C", 10],
            ].map(([icon, name, pct]) => (
              <div key={String(name)} className="flex items-center gap-3">
                <span className="w-6">{icon}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-mint/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-24 text-right tabular-nums text-muted">
                  {money(Math.round((s.premiumPriceCents * s.devShareBps * Number(pct)) / 1_000_000), s.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
