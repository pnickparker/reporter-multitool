import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { openFileStream } from "@/lib/storage/google-drive";

/** A big recording takes a while to send; the default would cut it off. */
export const maxDuration = 300;

/** iOS filenames (e.g. "09-23-2026, 2:18:02 PM") often contain characters like a narrow no-break space that HTTP headers can't carry raw — RFC 5987 encodes the real name while a stripped-down ASCII copy covers older clients. */
function contentDisposition(name: string): string {
  const asciiFallback = name.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Sends an asset's original source file back from Drive, piece by piece as it
 * arrives — feeds the native share sheet (see ShareFileButton) so a reporter can
 * AirDrop/text/save the actual recording without leaving the app for Drive's own
 * UI. It must never hold the whole file in memory: it used to, which worked for
 * small clips and failed (after minutes) on anything large. The size goes out up
 * front as Content-Length so the browser can decide whether the file is too big
 * to hand to the share sheet before downloading it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || !asset.sourceFile) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({ fileId: asset.sourceFile, fields: "name, mimeType" });
  const upstream = await openFileStream(auth, asset.sourceFile);

  // If the browser gives up (or decides the file is too big), stop pulling bytes from Drive.
  req.signal.addEventListener("abort", () => upstream.body.destroy());

  const headers = new Headers({
    "Content-Type": meta.data.mimeType ?? "application/octet-stream",
    "Content-Disposition": contentDisposition(meta.data.name ?? "file"),
  });
  if (upstream.headers["content-length"]) headers.set("Content-Length", upstream.headers["content-length"]);

  return new Response(Readable.toWeb(upstream.body) as unknown as ReadableStream, { status: 200, headers });
}
