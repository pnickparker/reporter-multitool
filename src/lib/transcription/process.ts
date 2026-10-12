import type { GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { transcribeBuffer, transcribeStream } from "./assemblyai";
import { processAiPipeline } from "@/lib/ai/pipeline";
import { errorMessage } from "@/lib/error-message";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { openFileStream } from "@/lib/storage/google-drive";
import { PROCESSING_TIMEOUT_MESSAGE } from "@/lib/assets/processing-limits";

/**
 * Runs after the upload response has already been sent (see `after()` in the
 * assets route) — transcription can take longer than an HTTP request should.
 */
export async function processTranscription(assetId: string, buffer: Buffer) {
  return runPipeline(assetId, () => transcribeBuffer(buffer));
}

async function runPipeline(assetId: string, transcribe: () => Promise<{ text: string; segments: unknown }>) {
  try {
    const { text, segments } = await transcribe();

    await prisma.transcript.upsert({
      where: { assetId },
      update: { text, segments: segments as object },
      create: { assetId, text, segments: segments as object },
    });

    // Nothing was said (or nothing could be recognized): there is nothing to find quotes in, so skip the AI steps.
    if (text.trim().length === 0) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: "READY", errorMessage: null } });
      return;
    }

    await prisma.asset.update({ where: { id: assetId }, data: { status: "GENERATING" } });
    await processAiPipeline(assetId);
  } catch (err) {
    console.error(`Transcription failed for asset ${assetId}:`, err);
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
  }
}

/**
 * The server stops any one request after this many seconds (set as `maxDuration`
 * on the routes that start processing). A kill at that point can't be caught, so
 * the work watches its own clock and, a little before, marks the recording
 * "saved, not processed" — otherwise the screen would say "Transcribing"
 * forever. If the work does finish after that, its result simply replaces the note.
 */
const SERVER_LIMIT_SECONDS = 300;
const SELF_DEADLINE_MS = (SERVER_LIMIT_SECONDS - 25) * 1000;

/**
 * For assets uploaded via the direct-to-Drive resumable flow (large
 * audio/video that never passed through our server) — streams the recording
 * from Drive straight to the transcription service (never holding the whole
 * file in memory, which a 560 MB video exhausted before), then runs the same
 * pipeline as before.
 */
export async function downloadAndProcessTranscription(
  assetId: string,
  driveFileId: string,
  user: { id: string; driveConnection: GoogleDriveConnection },
) {
  const deadline = setTimeout(() => {
    prisma.asset
      .updateMany({
        where: { id: assetId, status: { in: ["TRANSCRIBING", "GENERATING"] } },
        data: { status: "ERROR", errorMessage: PROCESSING_TIMEOUT_MESSAGE },
      })
      .catch((err) => console.error(`Couldn't record the processing timeout for asset ${assetId}:`, err));
  }, SELF_DEADLINE_MS);

  try {
    const auth = getDriveClientForUser(user.id, user.driveConnection);
    await runPipeline(assetId, async () => {
      const upstream = await openFileStream(auth, driveFileId);
      return transcribeStream(upstream.body);
    });
  } catch (err) {
    console.error(`Failed to process asset ${assetId} from Drive:`, err);
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
  } finally {
    clearTimeout(deadline);
  }
}
