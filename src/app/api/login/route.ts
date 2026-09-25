import { NextRequest, NextResponse } from "next/server";
import { SITE_AUTH_COOKIE, siteAuthToken } from "@/lib/site-auth";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const passphrase = formData.get("passphrase");
  const next = formData.get("next");
  const redirectPath = typeof next === "string" && next.startsWith("/") ? next : "/";

  if (typeof passphrase !== "string" || passphrase !== process.env.SITE_PASSPHRASE) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", redirectPath);
    return NextResponse.redirect(url, { status: 303 });
  }

  const res = NextResponse.redirect(new URL(redirectPath, req.url), { status: 303 });
  res.cookies.set(SITE_AUTH_COOKIE, siteAuthToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
