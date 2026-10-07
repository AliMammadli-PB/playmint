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
    share: 50,
    hold: s.holdDays,
    min: money(s.minPayoutCents, s.currency, locale),
    mb: s.maxZipMb,
  };
  const copy=locale==="en"?{title:"Make games. Find your players.",subtitle:"Publish your browser game. Manage your own subscriptions and earn from rewarded ads.",model:["Set a separate monthly subscription price and benefits for each game.","Players can play free games without an account. Subscriptions only cover the selected game.","Verified net ad revenue: 50% to the game's developer, 50% to Playmint.","Offer optional ads for extra HP, a revive or a bonus through the Playmint SDK.","Payments and ads need an active provider. Test transactions never count as earnings."],steps:[{t:"Upload",d:"Submit your HTML, CSS and JS game as a ZIP."},{t:"Review",d:"The admin reviews the files and scan report before publishing."},{t:"Set your price",d:"Choose your game's monthly subscription and benefits."},{t:"Earn",d:"Track verified advertising revenue in your panel."}]}:locale==="az"?{title:"Oyununu yarat. Oyunçularını tap.",subtitle:"Brauzer oyununu yayımla. Abunəliklərini idarə et, reklamlardan qazan.",model:["Hər oyun üçün aylıq qiyməti və üstünlükləri özün seç.","Pulsuz oyunlar giriş olmadan oynanır; abunəlik yalnız seçilən oyuna aiddir.","Təsdiqlənmiş xalis reklam gəliri: %50 geliştirici, %50 Playmint.","SDK vasitəsilə HP, revive və bonus üçün könüllü reklam təklif et.","Ödəniş və reklam təminatçısı qoşulmalıdır. Test əməliyyatları gəlir sayılmır."],steps:[{t:"Yüklə",d:"HTML, CSS, JS oyununu ZIP olaraq göndər."},{t:"Yoxlama",d:"Admin faylları və hesabatı yoxlayıb yayımlayır."},{t:"Qiymətini seç",d:"Oyununa aid aylıq abunəlik və üstünlükləri seç."},{t:"Qazan",d:"Reklam gəlirini panelindən izlə."}]}:{title:"Oyununu yarat. Oyuncularını bul.",subtitle:"Tarayıcı oyununu yayınla. Kendi aboneliklerini yönet, ödüllü reklamlardan kazan.",model:["Her oyun için aylık abonelik fiyatını ve avantajlarını kendin belirle.","Ücretsiz oyunlar giriş yapmadan oynanır. Abonelik yalnızca seçilen oyunda geçerlidir.","Doğrulanmış net reklam geliri: %50 oyunun geliştiricisi, %50 Playmint.","Playmint SDK ile ekstra HP, yeniden canlanma veya bonus için isteğe bağlı reklam sun.","Ödeme ve reklam sağlayıcısı bağlanmalıdır. Test işlemleri kazanca dahil edilmez."],steps:[{t:"Oyununu yükle",d:"HTML, CSS ve JS oyununu ZIP olarak gönder."},{t:"İnceleme",d:"Dosyalar ve tarama raporu admin tarafından incelenir."},{t:"Fiyatını belirle",d:"Oyununa özel aylık aboneliği ve avantajları seç."},{t:"Kazancını takip et",d:"Doğrulanmış reklam gelirini panelinde gör."}]};
  const isDev = user && (user.role === "developer" || user.role === "admin");

  return (
    <div>
      <section className="container-pm grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <p className="eyebrow">{t.devLanding.eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{copy.subtitle}</p>
          <img src="/brand/studio.webp" alt="" className="developer-editorial-art" width="1000" height="640"/><ol className="mt-10 grid gap-4 sm:grid-cols-2">
            {copy.steps.map((step, i) => (
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
            {copy.model.map((m) => (
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
