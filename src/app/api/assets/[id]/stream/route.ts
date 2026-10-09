import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { openFileStream } from "@/lib/storage/google-drive";

/** Playback can run longer than a normal request, since each stretch of a long recording streams through here. */
export const maxDuration = 300;

/**
 * Streams an audio/video asset for the in-app player, honoring Range
 * requests so the player can start instantly and jump to any moment (the
 * quote timestamps). Unlike /file, which hands over the whole file once for
 * Share, this never holds the file in memory.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id }, select: { sourceFile: true, type: true } });
  if (!asset || !asset.sourceFile || (asset.type !== "AUDIO" && asset.type !== "VIDEO")) {
    return NextResponse.json({ error: "Nothing to play" }, { status: 404 });
  }

  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const upstream = await openFileStream(auth, asset.sourceFile, req.headers.get("range") ?? undefined);

  // The player abandons a request whenever it seeks; don't keep pulling bytes from Drive for it.
  req.signal.addEventListener("abort", () => upstream.body.destroy());

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=300",
  });
  for (const name of ["content-type", "content-length", "content-range"] as const) {
    const value = upstream.headers[name];
    if (value) headers.set(name, value);
  }

  return new Response(Readable.toWeb(upstream.body) as unknown as ReadableStream, {
    status: upstream.status,
    headers,
  });
}
