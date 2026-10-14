import { Prisma, type GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteRemoteTranscript, transcribeBuffer, transcribeStream, type SpeakerChoice } from "./assemblyai";
import { processAiPipeline } from "@/lib/ai/pipeline";
import { errorMessage } from "@/lib/error-message";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { openFileStream } from "@/lib/storage/google-drive";
import { PROCESSING_TIMEOUT_MESSAGE } from "@/lib/assets/processing-limits";
import { recordUsage } from "@/lib/usage/record";
import { alertAssetProblem } from "@/lib/alerts";

export interface ProcessOptions {
  /** How many speakers to expect: a number, or "auto" to let the service decide. Leave out for the length-based default. */
  speakers?: SpeakerChoice;
  /**
   * True for a re-run of a recording that already has a finished transcript, best moments and posts. Those are
   * kept untouched until the new transcript has actually arrived; if the re-run fails before that, they are put
   * back as the current results (with a note). A re-run must never leave someone with less than they started with.
   */
  keepEarlierResults?: boolean;
}

/** Shown on a recording whose re-run couldn't finish: the earlier results are still there and unchanged. */
export const RERUN_KEPT_EARLIER_NOTE =
  "The re-run didn't finish, so your earlier transcript, best moments and post drafts are unchanged. You can try again.";

/** Progress shared with the deadline timer: has the new transcript replaced the earlier results yet? */
interface RunState {
  replaced: boolean;
}

/**
 * Runs after the upload response has already been sent (see `after()` in the
 * assets route) — transcription can take longer than an HTTP request should.
 */
export async function processTranscription(assetId: string, buffer: Buffer) {
  return runPipeline(
    assetId,
    async () => transcribeBuffer(buffer, await recordingLength(assetId)),
    {},
    { replaced: false },
  );
}

/** The recording's length in seconds as recorded at upload, or null if unknown — decides whether the speaker hint is used. */
async function recordingLength(assetId: string): Promise<number | null> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { duration: true } });
  return asset?.duration ?? null;
}

/** Records that a run didn't finish: an ordinary failure, or — for a re-run that never got to replace anything — back to the earlier results. */
async function recordFailure(assetId: string, message: string, options: ProcessOptions, state: RunState) {
  const restore = options.keepEarlierResults && !state.replaced;
  await prisma.asset.update({
    where: { id: assetId },
    data: restore ? { status: "READY", errorMessage: RERUN_KEPT_EARLIER_NOTE } : { status: "ERROR", errorMessage: message },
  });
  await alertAssetProblem(assetId, restore ? "A re-run didn't finish" : "A recording failed to process", message);
}

async function runPipeline(
  assetId: string,
  transcribe: () => Promise<{ text: string; segments: unknown; remoteId: string; audioSeconds: number | null }>,
  options: ProcessOptions,
  state: RunState,
) {
  try {
    const { text, segments, remoteId, audioSeconds } = await transcribe();

    // The new transcript has arrived: only now are the earlier best moments and posts cleared away (they'd be
    // stale or duplicated), in the same step that stores the new transcript.
    await prisma.$transaction([
      prisma.generatedSocialPost.deleteMany({ where: { assetId } }),
      prisma.flaggedQuote.deleteMany({ where: { assetId } }),
      prisma.transcript.upsert({
        where: { assetId },
        update: { text, segments: segments as object },
        create: { assetId, text, segments: segments as object },
      }),
      // The letters in a new transcript may mean different people, so names given to the old ones no longer apply.
      prisma.asset.update({ where: { id: assetId }, data: { speakerNames: Prisma.DbNull } }),
    ]);
    state.replaced = true;

    // Our copy of the text is saved, so the transcription service no longer needs its copy: delete it now.
    await deleteRemoteTranscript(remoteId);
    if (audioSeconds !== null) await recordUsage(assetId, { kind: "transcription", model: "assemblyai", audioSeconds });

    // Nothing was said (or nothing could be recognized): there is nothing to find quotes in, so skip the AI steps.
    if (text.trim().length === 0) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: "READY", errorMessage: null } });
      return;
    }

    await prisma.asset.update({ where: { id: assetId }, data: { status: "GENERATING", errorMessage: null } });
    await processAiPipeline(assetId);
  } catch (err) {
    console.error(`Transcription failed for asset ${assetId}:`, err);
    await recordFailure(assetId, errorMessage(err), options, state);
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
  options: ProcessOptions = {},
) {
  const state: RunState = { replaced: false };

  const deadline = setTimeout(() => {
    const restore = options.keepEarlierResults && !state.replaced;
    prisma.asset
      .updateMany({
        where: { id: assetId, status: { in: ["TRANSCRIBING", "GENERATING"] } },
        data: restore
          ? { status: "READY", errorMessage: RERUN_KEPT_EARLIER_NOTE }
          : { status: "ERROR", errorMessage: PROCESSING_TIMEOUT_MESSAGE },
      })
      .then(() => alertAssetProblem(assetId, "A recording ran out of processing time", restore ? RERUN_KEPT_EARLIER_NOTE : PROCESSING_TIMEOUT_MESSAGE))
      .catch((err) => console.error(`Couldn't record the processing timeout for asset ${assetId}:`, err));
  }, SELF_DEADLINE_MS);

  try {
    const auth = getDriveClientForUser(user.id, user.driveConnection);
    await runPipeline(
      assetId,
      async () => {
        const durationSeconds = await recordingLength(assetId);
        const upstream = await openFileStream(auth, driveFileId);
        return transcribeStream(upstream.body, durationSeconds, options.speakers);
      },
      options,
      state,
    );
  } catch (err) {
    console.error(`Failed to process asset ${assetId} from Drive:`, err);
    await recordFailure(assetId, errorMessage(err), options, state);
  } finally {
    clearTimeout(deadline);
  }
}
