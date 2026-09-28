import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { finalizeMediaUpload } from "@/lib/assets/create-asset";

/** Called once the browser has finished PUTting a file straight to Drive (see /api/quick-capture/init and /api/projects/[id]/assets/init) — records where it landed and kicks off transcription. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assetId } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, include: { project: true } });
  if (!asset || asset.project.ownerId !== user.id) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const { driveFileId } = await req.json();
  if (typeof driveFileId !== "string" || driveFileId.length === 0) {
    return NextResponse.json({ error: "driveFileId is required" }, { status: 400 });
  }

  const updated = await finalizeMediaUpload(assetId, driveFileId, user);
  return NextResponse.json(updated);
}
