import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">) {
  const { t } = await resolveLocale(params);
  return { title: t.nav.register };
}

export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/register">) {
  const { locale, t } = await resolveLocale(params);
  const next = (await searchParams).next;
  if (await getCurrentUser()) redirect(`/${locale}`);
  return (
    <AuthForm
      mode="register"
      locale={locale}
      next={typeof next === "string" ? next : undefined}
      labels={{
        title: t.auth.registerTitle,
        subtitle: t.auth.registerSubtitle,
        email: t.auth.email,
        password: t.auth.password,
        name: t.auth.name,
        submit: t.auth.submitRegister,
        switchText: t.auth.haveAccount,
        switchLink: t.nav.login,
      }}
    />
  );
}
