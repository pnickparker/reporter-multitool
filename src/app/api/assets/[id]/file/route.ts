import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { downloadFile } from "@/lib/storage/google-drive";

/** iOS filenames (e.g. "09-23-2026, 2:18:02 PM") often contain characters like a narrow no-break space that HTTP headers can't carry raw — RFC 5987 encodes the real name while a stripped-down ASCII copy covers older clients. */
function contentDisposition(name: string): string {
  const asciiFallback = name.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Streams an asset's original source file back from Drive — feeds the native share sheet (see ShareFileButton) so a reporter can AirDrop/text/save the actual recording without leaving the app for Drive's own UI. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || !asset.sourceFile) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({ fileId: asset.sourceFile, fields: "name, mimeType" });
  const buffer = await downloadFile(auth, asset.sourceFile);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": meta.data.mimeType ?? "application/octet-stream",
      "Content-Disposition": contentDisposition(meta.data.name ?? "file"),
    },
  });
}
