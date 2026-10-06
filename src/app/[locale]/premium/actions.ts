"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/premium";
import { paymentProvider } from "@/lib/payments";
import { isLocale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/rate-limit";

export async function subscribeAction(form: FormData) {
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as string) : "tr";
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/premium`);
  if (!rateLimit(`sub:${user.id}`, 5, 60_000)) redirect(`/${locale}/premium`);
  const url = await paymentProvider.startCheckout(user.id, `/${locale}/premium?success=1`);
  redirect(url);
}

export async function cancelAction(form: FormData) {
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as string) : "tr";
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const sub = await getActiveSubscription(user.id);
  if (sub) await paymentProvider.cancel(sub.id);
  redirect(`/${locale}/premium`);
}
