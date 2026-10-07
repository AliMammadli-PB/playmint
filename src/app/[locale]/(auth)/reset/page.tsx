import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { ResetForm } from "../PasswordForms";

export async function generateMetadata({ params }: PageProps<"/[locale]/reset">) {
  const { t } = await resolveLocale(params);
  return { title: t.auth.resetTitle };
}

export default async function ResetPage({ params, searchParams }: PageProps<"/[locale]/reset">) {
  const { locale, t } = await resolveLocale(params);
  if (await getCurrentUser()) redirect(`/${locale}`);
  const token = (await searchParams).token;
  return (
    <div className="container-pm py-16">
      <div className="card mx-auto max-w-md space-y-4 p-7">
        <Link href={`/${locale}/login`} className="text-sm text-muted">← Playmint</Link>
        <h1 className="h1">{t.auth.resetTitle}</h1>
        <p className="text-sm text-muted">{t.auth.resetText}</p>
        {typeof token === "string" && token ? (
          <ResetForm locale={locale} token={token} passwordLabel={t.auth.newPassword} confirmLabel={t.auth.confirmPassword} submit={t.auth.resetSubmit} />
        ) : (
          <p className="text-sm text-danger">{t.auth.resetInvalid}</p>
        )}
      </div>
    </div>
  );
}
