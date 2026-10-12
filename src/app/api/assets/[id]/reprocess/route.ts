import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { downloadAndProcessTranscription } from "@/lib/transcription/process";
import { isStuckProcessing } from "@/lib/assets/processing-limits";

/** Same allowance as the finalize route, since processing runs in the background of this request. */
export const maxDuration = 300;

/**
 * "Transcribe now" for a recording that was saved but never processed — too
 * long for the automatic limit, cut off by the server's time limit, or failed.
 * Starts a fresh run with a full time allowance. Never touches a recording
 * that's still uploading, mid-processing, or already finished.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id }, include: { project: true } });
  if (!asset || asset.project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((asset.type !== "AUDIO" && asset.type !== "VIDEO") || !asset.sourceFile) {
    return NextResponse.json({ error: "Nothing to transcribe here" }, { status: 409 });
  }
  if (asset.status !== "ERROR" && !isStuckProcessing(asset)) {
    return NextResponse.json({ error: "This recording is already being processed or is finished" }, { status: 409 });
  }

  // Clear whatever an earlier, partly finished run left behind so the new run doesn't duplicate it.
  await prisma.$transaction([
    prisma.generatedSocialPost.deleteMany({ where: { assetId: id } }),
    prisma.flaggedQuote.deleteMany({ where: { assetId: id } }),
    prisma.transcript.deleteMany({ where: { assetId: id } }),
    prisma.asset.update({
      where: { id },
      data: { status: "TRANSCRIBING", errorMessage: null, processingStartedAt: new Date() },
    }),
  ]);

  after(() => downloadAndProcessTranscription(id, asset.sourceFile, user));

  return NextResponse.json({ started: true });
}
