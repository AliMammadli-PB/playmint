import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">) {
  const { t } = await resolveLocale(params);
  return { title: t.nav.login };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale, t } = await resolveLocale(params);
  const query = await searchParams;
  const next = query.next;
  if (await getCurrentUser()) redirect(`/${locale}`);
  return (
    <AuthForm
      mode="login"
      locale={locale}
      notice={query.reset === "1" ? t.auth.resetDone : undefined}
      next={typeof next === "string" ? next : undefined}
      labels={{
        title: t.auth.loginTitle,
        email: t.auth.email,
        password: t.auth.password,
        name: t.auth.name,
        submit: t.auth.submitLogin,
        switchText: t.auth.noAccount,
        switchLink: t.nav.register,
      }}
    />
  );
}
