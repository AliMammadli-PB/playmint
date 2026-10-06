import { resolveLocale } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { FormSuccess, SubmitButton } from "@/components/ui";
import { settingsAction } from "../actions";

export default async function AdminSettings({ params, searchParams }: PageProps<"/[locale]/admin/settings">) {
  const { locale, t } = await resolveLocale(params);
  const sp = await searchParams;
  const s = await getSettings();
  const fields: [string, string, number | string, string?][] = [
    ["devShare", t.admin.sDevShare, s.devShareBps / 100, "1"],
    ["price", t.admin.sPrice, s.premiumPriceCents / 100, "0.01"],
    ["currency", t.admin.sCurrency, s.currency],
    ["fee", t.admin.sFee, s.paymentFeeBps / 100, "0.01"],
    ["minPayout", t.admin.sMinPayout, s.minPayoutCents / 100, "0.01"],
    ["holdDays", t.admin.sHold, s.holdDays, "1"],
    ["dailyCap", t.admin.sDailyCap, s.dailyCapSeconds / 3600, "0.5"],
    ["likeBonus", t.admin.sLikeBonus, Math.round(s.likeBonus * 100), "1"],
    ["maxZip", t.admin.sMaxZip, s.maxZipMb, "1"],
  ];
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="h1">{t.admin.settingsTitle}</h1>
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
