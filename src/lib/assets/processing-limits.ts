/**
 * Single source of truth for "will this file process in time." Deliberately
 * separate from Vercel's own hard execution ceiling (set via `maxDuration`
 * on the routes that trigger transcription): that's a fixed platform limit,
 * invisible to users and the same for everyone. This is the softer,
 * product-level number we choose to allow before even attempting it — the
 * thing that would become per-tier (10 min free, 30 min paid, etc.) if this
 * ever becomes a paid product. Keep it well under the hard ceiling for
 * safety margin, and keep it in exactly this one place.
 */

/** The Vercel maxDuration set on finalize/upload routes. Any product-level limit below must stay comfortably under this. */
const VERCEL_HARD_CEILING_SECONDS = 300;

/**
 * The limit we currently sell/allow — today, a single flat v1 tier. Picked
 * so that a 10-minute video at typical 1080p phone bitrate (the number
 * given to the freelance testers as "safe") clears with real margin, while
 * 15+ minutes gets rejected.
 */
export const MAX_ESTIMATED_PROCESSING_SECONDS = 260;

/**
 * Calibrated from two real data points (2026-10-01): a 274.7MB/176s video
 * that timed out (implying ~6.3MB/s effective download throughput once
 * transcription time is subtracted out), and a 2.3MB/562s synthetic clip
 * that transcribed+pipelined in ~28s (~0.05s of processing per second of
 * audio). Padded modestly for safety margin, not fitted tightly — refine
 * as more real test data comes in.
 */
const ASSUMED_DOWNLOAD_BYTES_PER_SECOND = 5.5 * 1024 * 1024; // ~5.5MB/s, a bit under the one measurement we have
const ASSUMED_PROCESSING_SECONDS_PER_AUDIO_SECOND = 0.06; // a bit over the one measurement we have
const FIXED_OVERHEAD_SECONDS = 20; // Drive auth, AssemblyAI submission, Claude pipeline round trips

export interface ProcessingEstimateInput {
  /** Bytes — from Drive's file metadata. */
  fileSizeBytes: number | null;
  /** Seconds — from Drive's video metadata, when available (not exposed for audio). */
  durationSeconds: number | null;
}

/**
 * Best-effort estimate of total processing time (download + transcribe +
 * AI pipeline) for a file we haven't attempted yet. Missing inputs (e.g. no
 * duration for an audio file) just drop that term rather than failing closed
 * — file size alone is still a reasonable signal, since download time scales
 * with size regardless of asset type.
 */
export function estimateProcessingSeconds({ fileSizeBytes, durationSeconds }: ProcessingEstimateInput): number {
  const downloadSeconds = fileSizeBytes ? fileSizeBytes / ASSUMED_DOWNLOAD_BYTES_PER_SECOND : 0;
  const transcribeSeconds = durationSeconds ? durationSeconds * ASSUMED_PROCESSING_SECONDS_PER_AUDIO_SECOND : 0;
  return FIXED_OVERHEAD_SECONDS + downloadSeconds + transcribeSeconds;
}

export function exceedsProcessingLimit(input: ProcessingEstimateInput): boolean {
  return estimateProcessingSeconds(input) > MAX_ESTIMATED_PROCESSING_SECONDS;
}

if (MAX_ESTIMATED_PROCESSING_SECONDS >= VERCEL_HARD_CEILING_SECONDS) {
  throw new Error("MAX_ESTIMATED_PROCESSING_SECONDS must stay below the Vercel hard ceiling for safety margin");
}
