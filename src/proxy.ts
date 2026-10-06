import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookie, pickLocale } from "@/lib/i18n/config";

/** Prefix every page URL with a locale (/tr, /az, /en). */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();
  const cookie = request.cookies.get(localeCookie)?.value;
  const locale = isLocale(cookie) ? cookie : pickLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|play|media|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
