import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { resolveLocale } from "@/lib/i18n";
import { requireDeveloper } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function DevSettings({ params }: PageProps<"/[locale]/dev/settings">) {
  const { locale, t } = await resolveLocale(params);
  const user = await requireDeveloper(locale);
  const p = (await db.select().from(schema.developerProfiles).where(eq(schema.developerProfiles.userId, user.id)))[0];
  if (!p) redirect(`/${locale}/developers`);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="h1">{t.dev.settingsTitle}</h1>
      <SettingsForm
        locale={locale}
        labels={{
          profileSection: t.dev.profileSection,
          displayName: t.devLanding.displayName,
          bio: t.dev.bio,
          website: t.dev.website,
          payoutSection: t.dev.payoutSection,
          payoutMethod: t.dev.payoutMethod,
          payoutName: t.dev.payoutName,
          payoutDetails: t.dev.payoutDetails,
          save: t.common.save,
          saved: t.common.saved,
        }}
        methods={(["iban", "paypal", "wise"] as const).map((m) => ({ value: m, label: t.dev.payoutMethods[m] }))}
        defaults={p}
      />
    </div>
  );
}
