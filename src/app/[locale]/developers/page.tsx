import Link from "next/link";
import { resolveLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/text";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { BecomeDevForm } from "./BecomeDevForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/developers">) {
  const { t } = await resolveLocale(params);
  return { title: t.nav.developers };
}

export default async function DevelopersPage({ params }: PageProps<"/[locale]/developers">) {
  const { locale, t } = await resolveLocale(params);
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const vars = {
    share: Math.round(s.devShareBps / 100),
    hold: s.holdDays,
    min: money(s.minPayoutCents, s.currency, locale),
    mb: s.maxZipMb,
  };
  const isDev = user && (user.role === "developer" || user.role === "admin");

  return (
    <div>
      <section className="container-pm grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <p className="eyebrow">{t.devLanding.eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t.devLanding.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{t.devLanding.subtitle}</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2">
            {t.devLanding.steps.map((step, i) => (
              <li key={step.t} className="card p-5">
                <div className="font-display text-sm font-bold text-mint">0{i + 1}</div>
                <div className="mt-1 font-display text-lg font-bold">{step.t}</div>
                <p className="mt-1 text-sm text-muted">{fill(step.d, vars)}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-7 lg:sticky lg:top-24">
          <h2 className="h2">{t.devLanding.formTitle}</h2>
          <div className="mt-5">
            {isDev ? (
              <div className="space-y-4">
                <p className="text-muted">✓ {t.devLanding.already}</p>
                <Link href={`/${locale}/dev`} className="btn btn-primary w-full">{t.devLanding.goPanel} →</Link>
              </div>
            ) : user ? (
              <BecomeDevForm
                locale={locale}
                defaultName={user.name}
                labels={{
                  handle: t.devLanding.handle,
                  handleHint: t.devLanding.handleHint,
                  displayName: t.devLanding.displayName,
                  accept: t.devLanding.accept,
                  submit: t.devLanding.submit,
                }}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-muted">{t.devLanding.loginFirst}</p>
                <div className="flex gap-2">
                  <Link href={`/${locale}/register?next=/${locale}/developers`} className="btn btn-primary flex-1">{t.nav.register}</Link>
                  <Link href={`/${locale}/login?next=/${locale}/developers`} className="btn btn-ghost flex-1">{t.nav.login}</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="model" className="container-pm grid scroll-mt-24 gap-6 md:grid-cols-2">
        <div className="card p-7">
          <h2 className="h2">{t.devLanding.modelTitle}</h2>
          <ul className="mt-5 space-y-4">
            {t.devLanding.model.map((m) => (
              <li key={m} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="mt-0.5 text-mint">●</span>
                <span>{fill(m, vars)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-7">
          <h2 className="h2">{t.devLanding.rulesTitle}</h2>
          <ul className="mt-5 space-y-4">
            {t.devLanding.rules.map((m) => (
              <li key={m} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="mt-0.5 text-amber">!</span>
                <span>{fill(m, vars)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
