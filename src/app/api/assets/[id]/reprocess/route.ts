import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { downloadAndProcessTranscription } from "@/lib/transcription/process";
import { isStuckProcessing } from "@/lib/assets/processing-limits";
import type { SpeakerChoice } from "@/lib/transcription/assemblyai";

/** Same allowance as the finalize route, since processing runs in the background of this request. */
export const maxDuration = 300;

/**
 * Starts processing a recording again, in two cases:
 *  - "Transcribe now": it was saved but never processed (too long for the automatic limit, cut off by the
 *    server's time limit, or failed). A fresh run with a full time allowance.
 *  - "Re-run" (`rerun: true`): it's finished, but the reporter wants it done again — typically with a different
 *    speaker count (`speakers`: a number from 2 to 10, or "auto"). The earlier transcript, best moments and
 *    posts stay untouched until the new transcript arrives, and come back if the re-run can't finish.
 * Never touches a recording that's still uploading or mid-processing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const body = await req.json().catch(() => ({}));
  const rerun = body?.rerun === true;
  let speakers: SpeakerChoice | undefined;
  if (body?.speakers === "auto") speakers = "auto";
  else if (body?.speakers !== undefined && body?.speakers !== null) {
    const n = Number(body.speakers);
    if (!Number.isInteger(n) || n < 2 || n > 10) {
      return NextResponse.json({ error: "speakers must be a whole number from 2 to 10, or \"auto\"" }, { status: 400 });
    }
    speakers = n;
  }

  const asset = await prisma.asset.findUnique({ where: { id }, include: { project: true } });
  if (!asset || asset.project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((asset.type !== "AUDIO" && asset.type !== "VIDEO") || !asset.sourceFile) {
    return NextResponse.json({ error: "Nothing to transcribe here" }, { status: 409 });
  }

  const canTranscribeNow = asset.status === "ERROR" || isStuckProcessing(asset);
  const canRerun = rerun && asset.status === "READY";
  if (!canTranscribeNow && !canRerun) {
    return NextResponse.json({ error: "This recording is already being processed or can't be re-run" }, { status: 409 });
  }

  // Earlier results are deliberately NOT cleared here — see the note on keepEarlierResults.
  await prisma.asset.update({
    where: { id },
    data: { status: "TRANSCRIBING", errorMessage: null, processingStartedAt: new Date() },
  });

  after(() => downloadAndProcessTranscription(id, asset.sourceFile, user, { speakers, keepEarlierResults: canRerun }));

  return NextResponse.json({ started: true });
}
