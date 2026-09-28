import type { GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { transcribeBuffer } from "./assemblyai";
import { processAiPipeline } from "@/lib/ai/pipeline";
import { errorMessage } from "@/lib/error-message";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { downloadFile } from "@/lib/storage/google-drive";

/**
 * Runs after the upload response has already been sent (see `after()` in the
 * assets route) — transcription can take longer than an HTTP request should.
 */
export async function processTranscription(assetId: string, buffer: Buffer) {
  try {
    const { text, segments } = await transcribeBuffer(buffer);

    await prisma.transcript.upsert({
      where: { assetId },
      update: { text, segments: segments as object },
      create: { assetId, text, segments: segments as object },
    });

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
 * For assets uploaded via the direct-to-Drive resumable flow (large
 * audio/video that never passed through our server) — downloads the bytes
 * back from Drive first, then transcribes exactly as before.
 */
export async function downloadAndProcessTranscription(
  assetId: string,
  driveFileId: string,
  user: { id: string; driveConnection: GoogleDriveConnection },
) {
  try {
    const auth = getDriveClientForUser(user.id, user.driveConnection);
    const buffer = await downloadFile(auth, driveFileId);
    await processTranscription(assetId, buffer);
  } catch (err) {
    console.error(`Failed to download asset ${assetId} from Drive for transcription:`, err);
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
  }
}
