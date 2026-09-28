import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

const DRIVE_UPLOAD_PREFIX = "https://www.googleapis.com/upload/drive/v3/files";

/**
 * Relays one chunk of a large audio/video file to its Drive resumable
 * upload session. Google's Drive API doesn't allow a browser to PUT
 * directly to googleapis.com cross-origin (confirmed by a real CORS
 * failure — "Failed to fetch"/"Load failed" — during testing), so the
 * browser instead sends chunks here, same-origin, and this relays each one
 * server-to-server. Chunks are kept under Vercel's request body limit
 * (~4.5MB) by the client; this only forwards bytes it's already received,
 * so it isn't itself constrained by that limit for the file as a whole.
 */
export async function POST(req: NextRequest) {
  await getCurrentUser();

  const uploadUrl = req.headers.get("x-upload-url");
  const rangeStart = req.headers.get("x-range-start");
  const rangeEnd = req.headers.get("x-range-end");
  const totalSize = req.headers.get("x-total-size");

  if (!uploadUrl || !uploadUrl.startsWith(DRIVE_UPLOAD_PREFIX)) {
    return NextResponse.json({ error: "Invalid or missing upload URL" }, { status: 400 });
  }
  if (!rangeStart || !rangeEnd || !totalSize) {
    return NextResponse.json({ error: "Missing chunk range headers" }, { status: 400 });
  }

  const chunk = Buffer.from(await req.arrayBuffer());

  const driveRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
      "Content-Length": String(chunk.length),
    },
    body: chunk,
  });

  const body = await driveRes.text();
  return new NextResponse(body, {
    status: driveRes.status,
    headers: { "Content-Type": driveRes.headers.get("content-type") ?? "application/json" },
  });
}
