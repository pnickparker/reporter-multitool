import { prisma } from "@/lib/db";

/**
 * There's no login/session system yet — v1 is Nick + a couple of testers
 * sharing one connected Drive. This stands in for "whoever is logged in"
 * until real auth exists.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({
    where: { driveConnection: { isNot: null } },
    include: { driveConnection: true },
    // Deterministic: with real testers now sharing the site passphrase, if
    // anyone else ever hits /api/auth/google/connect this must still resolve
    // to whoever connected first (Nick), not an arbitrary row.
    orderBy: { createdAt: "asc" },
  });

  if (!user || !user.driveConnection) {
    throw new Error("No connected user yet — visit /api/auth/google/connect first.");
  }

  return { ...user, driveConnection: user.driveConnection };
}
