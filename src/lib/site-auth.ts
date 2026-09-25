import { createHmac, timingSafeEqual } from "node:crypto";

export const SITE_AUTH_COOKIE = "site_auth";

/** Deterministic token derived from the shared passphrase — the cookie never stores the passphrase itself. */
export function siteAuthToken(): string {
  const passphrase = process.env.SITE_PASSPHRASE ?? "";
  return createHmac("sha256", passphrase).update("reporter-multitool-gate").digest("hex");
}

export function isValidSiteAuthCookie(value: string | undefined): boolean {
  if (!value) return false;
  const expected = siteAuthToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
