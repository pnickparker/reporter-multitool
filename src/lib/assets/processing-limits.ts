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
 * The limit we currently allow: how long processing may be expected to take, kept
 * well under the server's hard 5-minute ceiling (the work also watches its own
 * clock — see process.ts — so a wrong guess ends as "saved, not transcribed",
 * never a stuck screen). Today a single flat v1 tier; the number that would
 * become per-plan.
 */
export const MAX_ESTIMATED_PROCESSING_SECONDS = 260;

/**
 * Calibrated from real runs on Vercel (2026-10-12), with the recording streamed
 * straight from Drive to the transcription service (see process.ts):
 *   - a 3.61 GB, 35:24 interview finished in 159 s: the transcript was ready at
 *     116 s and the AI steps (best moments + post drafts) took the other 43 s;
 *   - timed separately, the transcription service itself took 42 s for those
 *     35 minutes (~50x real time), so moving the file took ~74 s (~49 MB/s);
 *   - a 7.6 GB recording did not finish inside the allowance.
 * The lesson: it is the file's SIZE (bytes to move), not the recording's length,
 * that mostly decides the time — the old formula had this backwards and rejected
 * a 35-minute video that processes in under three minutes. Each figure below is
 * padded roughly 20-60% beyond what was measured; refine as more runs come in.
 */
const ASSUMED_BYTES_PER_SECOND_MOVING_THE_FILE = 40_000_000; // measured ~49 MB/s
const ASSUMED_SECONDS_PER_AUDIO_SECOND = 0.03; // measured ~0.02 (50x real time)
const FIXED_OVERHEAD_SECONDS = 55; // measured ~43 s of AI steps, plus authentication and hand-offs

/**
 * When the recording's length isn't known, assume it's long for its size (a low
 * bitrate stretches the same bytes over more time), so the guess errs toward
 * "saved, not transcribed" — which Transcribe now can still override.
 */
const FALLBACK_BYTES_PER_AUDIO_SECOND = 250_000;

export interface ProcessingEstimateInput {
  /** Bytes — from Drive's file metadata. */
  fileSizeBytes: number | null;
  /** Seconds — from Drive's video metadata, when available (not exposed for audio). */
  durationSeconds: number | null;
}

/**
 * Best-effort estimate of total processing time (move the file + transcribe +
 * AI steps) for a file we haven't attempted yet. If the length is unknown it is
 * guessed from the size (conservatively, see above); if the size is unknown only
 * the length-based part is counted.
 */
export function estimateProcessingSeconds({ fileSizeBytes, durationSeconds }: ProcessingEstimateInput): number {
  const movingSeconds = fileSizeBytes ? fileSizeBytes / ASSUMED_BYTES_PER_SECOND_MOVING_THE_FILE : 0;
  const audioSeconds = durationSeconds ?? (fileSizeBytes ? fileSizeBytes / FALLBACK_BYTES_PER_AUDIO_SECOND : 0);
  return FIXED_OVERHEAD_SECONDS + movingSeconds + audioSeconds * ASSUMED_SECONDS_PER_AUDIO_SECOND;
}

export function exceedsProcessingLimit(input: ProcessingEstimateInput): boolean {
  return estimateProcessingSeconds(input) > MAX_ESTIMATED_PROCESSING_SECONDS;
}

if (MAX_ESTIMATED_PROCESSING_SECONDS >= VERCEL_HARD_CEILING_SECONDS) {
  throw new Error("MAX_ESTIMATED_PROCESSING_SECONDS must stay below the Vercel hard ceiling for safety margin");
}

/**
 * What a recording that is too long to transcribe automatically says. The
 * recording itself is fine — it's saved in full — so this must read as "saved,
 * transcript not made yet", never as a failure: nothing may make a reporter
 * feel their recording was refused or lost.
 */
export const OVER_LIMIT_MESSAGE =
  "Saved. This recording is too long or large to transcribe automatically right now, so there is no transcript or best moments yet. Your original is safe — tap Share on this item to get it out.";

/**
 * What a recording says when it was saved but its processing didn't finish in
 * time (the server gives each recording a fixed number of minutes). Like the
 * over-limit message, it must read as "saved, transcript not made yet" — never
 * as a failure or a loss.
 */
export const PROCESSING_TIMEOUT_MESSAGE =
  "Saved. Processing this recording took longer than the server allows, so there is no transcript or best moments yet. Your original is safe — tap Share on this item to get it out, or try Transcribe now.";

/** The wording used before the messages above (kept so older rows are still recognised). */
const LEGACY_OVER_LIMIT_PREFIX = "This recording is too long/large";

/** True for a recording that was saved fine but not processed (too long, or ran out of time) — as opposed to one that genuinely failed. */
export function isSavedNotProcessed(asset: { status: string; errorMessage: string | null }): boolean {
  if (asset.status !== "ERROR" || !asset.errorMessage) return false;
  return asset.errorMessage.startsWith("Saved. ") || asset.errorMessage.startsWith(LEGACY_OVER_LIMIT_PREFIX);
}

/** How long processing may sit in "Transcribing" before the screen stops claiming it's still working: the server's own limit is 5 minutes, so anything older was cut off. */
const STUCK_PROCESSING_MS = 12 * 60 * 1000;

/** A recording still marked as processing long after the server could have been working on it. */
export function isStuckProcessing(asset: { status: string; uploadedAt: Date; processingStartedAt: Date | null }): boolean {
  if (asset.status !== "TRANSCRIBING" && asset.status !== "GENERATING") return false;
  const startedAt = asset.processingStartedAt ?? asset.uploadedAt; // older rows have no start time recorded
  return Date.now() - startedAt.getTime() > STUCK_PROCESSING_MS;
}
