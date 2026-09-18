import type { GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createOAuthClient } from "./oauth";

/**
 * Returns an OAuth2Client authenticated for this user's Drive. It refreshes
 * the access token automatically when expired (google-auth-library handles
 * this internally as long as a refresh_token is set) and persists the
 * refreshed token back to the DB via the "tokens" event.
 */
export function getDriveClientForUser(userId: string, connection: GoogleDriveConnection) {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiresAt.getTime(),
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    prisma.googleDriveConnection
      .update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
        },
      })
      .catch((err) => console.error("Failed to persist refreshed Drive token:", err));
  });

  return client;
}
