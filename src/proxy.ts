import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_AUTH_COOKIE, isValidSiteAuthCookie } from "@/lib/site-auth";

/**
 * Gates the whole app behind one shared passphrase (see /login) so a public
 * deployment isn't wide open on Nick's paid API keys. Deliberately simple —
 * no per-person accounts, matching the app's existing flat-permissions
 * design (everyone who knows the passphrase is an equal peer).
 */
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (isValidSiteAuthCookie(cookie)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
