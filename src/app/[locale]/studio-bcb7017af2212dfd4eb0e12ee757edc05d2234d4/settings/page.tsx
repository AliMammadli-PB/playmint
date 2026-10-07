import { resolveLocale } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { FormSuccess, SubmitButton } from "@/components/ui";
import { settingsAction } from "../actions";

export default async function AdminSettings({ params, searchParams }: PageProps<"/[locale]/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/settings">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const s = await getSettings();
  const fields: [string, string, number | string, string?][] = [
    ["fee", t.admin.sFee, s.paymentFeeBps / 100, "0.01"],
    ["minPayout", t.admin.sMinPayout, s.minPayoutCents / 100, "0.01"],
    ["holdDays", t.admin.sHold, s.holdDays, "1"],
    ["maxZip", t.admin.sMaxZip, s.maxZipMb, "1"],
  ];
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="h1">{t.admin.settingsTitle}</h1><p className="text-sm text-muted">{locale==="en"?"Rewarded ads: 50% developer / 50% Playmint. Game prices are set by developers.":locale === "az" ? "Mükafatlı reklamlar: 50% geliştirici / 50% Playmint. Oyun qiymətlərini geliştiricilər müəyyən edir." : "Ödüllü reklamlar: %50 geliştirici / %50 Playmint. Oyun fiyatlarını geliştiriciler belirler."}</p>
      {sp.saved && <FormSuccess message={t.common.saved} />}
      <form action={settingsAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        {fields.map(([name, label, value, step]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              defaultValue={value}
              readOnly={name==="minPayout"||name==="holdDays"}
              type={step ? "number" : "text"}
              step={step}
              className="input"
              {...(name === "currency" ? { pattern: "[A-Z]{3}", maxLength: 3 } : {})}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <SubmitButton>{t.common.save}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
