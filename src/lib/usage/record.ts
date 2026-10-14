import { prisma } from "@/lib/db";
import { claudeCost, transcriptionCost } from "./pricing";

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Notes what a processing step cost. Best effort: a problem recording usage is logged
 * and never fails the recording it describes.
 */
export async function recordUsage(
  assetId: string,
  entry:
    | { kind: "transcription"; model: string; audioSeconds: number }
    | { kind: "quotes" | "posts"; usage: AiUsage },
): Promise<void> {
  try {
    if (entry.kind === "transcription") {
      await prisma.usageRecord.create({
        data: { assetId, kind: "transcription", model: entry.model, audioSeconds: entry.audioSeconds, costUsd: transcriptionCost(entry.audioSeconds) },
      });
    } else {
      const { model, inputTokens, outputTokens } = entry.usage;
      await prisma.usageRecord.create({
        data: { assetId, kind: entry.kind, model, inputTokens, outputTokens, costUsd: claudeCost(model, inputTokens, outputTokens) },
      });
    }
  } catch (err) {
    console.error(`Couldn't record usage for asset ${assetId}:`, err);
  }
}
