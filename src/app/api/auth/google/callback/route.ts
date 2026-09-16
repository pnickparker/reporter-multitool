import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google/oauth";
import { findOrCreateAppFolder } from "@/lib/storage/google-drive";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          error:
            "No refresh token returned. Revoke the app's access at https://myaccount.google.com/permissions and try again (Google only issues a refresh token on first consent).",
        },
        { status: 400 },
      );
    }

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return NextResponse.json({ error: "Could not read profile email" }, { status: 400 });
    }

    const folderId = await findOrCreateAppFolder(client);

    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name ?? undefined },
      create: { email: profile.email, name: profile.name ?? undefined },
    });

    await prisma.googleDriveConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date!),
        driveFolderId: folderId,
      },
      create: {
        userId: user.id,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date!),
        driveFolderId: folderId,
      },
    });

    return NextResponse.json({
      connected: true,
      email: profile.email,
      driveFolderId: folderId,
    });
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
