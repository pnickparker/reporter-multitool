import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { finalizeMediaUpload } from "@/lib/assets/create-asset";

/**
 * Vercel's default function duration is far too short for the background
 * work this route kicks off via after() — downloading a large video from
 * Drive, transcribing it, then running the AI pipeline. 300s is the max
 * allowed on a Pro plan; a real clip got silently killed mid-transcription
 * with no error recorded before this was set (see V1_SCOPE.md, Travis's
 * 274MB/176s video, 2026-10-01).
 */
export const maxDuration = 300;

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
