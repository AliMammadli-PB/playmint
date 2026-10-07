import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { ForgotForm } from "../PasswordForms";

export async function generateMetadata({ params }: PageProps<"/[locale]/forgot">) {
  const { t } = await resolveLocale(params);
  return { title: t.auth.forgotTitle };
}

export default async function ForgotPage({ params }: PageProps<"/[locale]/forgot">) {
  const { locale, t } = await resolveLocale(params);
  if (await getCurrentUser()) redirect(`/${locale}`);
  return (
    <div className="container-pm py-16">
      <div className="card mx-auto max-w-md space-y-4 p-7">
        <Link href={`/${locale}/login`} className="text-sm text-muted">← Playmint</Link>
        <h1 className="h1">{t.auth.forgotTitle}</h1>
        <p className="text-sm text-muted">{t.auth.forgotText}</p>
        <ForgotForm locale={locale} emailLabel={t.auth.email} submit={t.auth.forgotSubmit} />
      </div>
    </div>
  );
}
