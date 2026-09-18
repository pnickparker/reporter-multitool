import { prisma } from "@/lib/db";
import { transcribeBuffer } from "./assemblyai";
import { processAiPipeline } from "@/lib/ai/pipeline";

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
    await prisma.asset.update({ where: { id: assetId }, data: { status: "ERROR" } });
  }
}
