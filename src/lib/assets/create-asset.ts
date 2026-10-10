import { after } from "next/server";
import type { Asset, AssetType, GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { GoogleDriveStorage, createResumableUploadSession, getFileStats } from "@/lib/storage/google-drive";
import { processTranscription, downloadAndProcessTranscription } from "@/lib/transcription/process";
import { errorMessage } from "@/lib/error-message";
import { estimateProcessingSeconds, exceedsProcessingLimit } from "@/lib/assets/processing-limits";

export function defaultProjectName(): string {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Quick Capture — ${date}`;
}

export class AssetUploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type CurrentUser = { id: string; driveConnection: GoogleDriveConnection };

/** AUDIO/VIDEO: full pipeline — upload to Drive, then transcribe + flag quotes + draft posts. */
async function handleMediaUpload(asset: Asset, file: File, user: CurrentUser) {
  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await storage.uploadFile({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    data: buffer,
  });

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { sourceFile: uploaded.id, status: "TRANSCRIBING" },
  });

  after(() => processTranscription(asset.id, buffer));

  return updated;
}

/** DOCUMENT: reference material only — stored in Drive, no transcription or AI processing. */
async function handleDocumentUpload(asset: Asset, file: File, user: CurrentUser) {
  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await storage.uploadFile({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    data: buffer,
  });

  return prisma.asset.update({
    where: { id: asset.id },
    data: { sourceFile: uploaded.id, status: "READY" },
  });
}

/** NOTE: reference material only — the typed/dictated text is saved to Drive as a .txt file (so it lives alongside everything else) and shown via the existing Transcript display, but never quote-flagged. */
async function handleNoteUpload(asset: Asset, text: string, user: CurrentUser) {
  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
  const uploaded = await storage.uploadFile({
    fileName: `note-${asset.id}.txt`,
    mimeType: "text/plain",
    data: Buffer.from(text, "utf-8"),
  });

  await prisma.transcript.create({ data: { assetId: asset.id, text, segments: [] } });

  return prisma.asset.update({
    where: { id: asset.id },
    data: { sourceFile: uploaded.id, status: "READY" },
  });
}

/** What kind of asset a file is, from its MIME type — null when it isn't something we handle yet. */
export function assetTypeForMime(mimeType: string): AssetType | null {
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("image/") || mimeType === "application/pdf") return "DOCUMENT";
  return null;
}

/**
 * Starts a direct-to-Drive upload — the file's bytes go straight from the
 * browser to Drive, bypassing our server (and its platform request-size
 * limit) entirely. Works for any supported file, not just big recordings:
 * a phone photo or an agenda PDF can exceed that limit too. The asset's type
 * is worked out from the file itself. Returns the session URL for the browser
 * to upload to, plus the asset row it can report progress against.
 */
export async function initUpload(
  projectId: string,
  input: { fileName: string; mimeType: string },
  user: CurrentUser,
) {
  const type = assetTypeForMime(input.mimeType);
  if (!type) throw new AssetUploadError("That file type isn't supported yet", 400);

  const asset = await prisma.asset.create({
    data: { projectId, type, mimeType: input.mimeType, sourceFile: "", status: "UPLOADING" },
  });

  try {
    const auth = getDriveClientForUser(user.id, user.driveConnection);
    const uploadUrl = await createResumableUploadSession(auth, {
      fileName: input.fileName,
      mimeType: input.mimeType,
      folderId: user.driveConnection.driveFolderId,
    });
    return { assetId: asset.id, uploadUrl };
  } catch (err) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
    throw new AssetUploadError("Failed to start upload", 500);
  }
}

/**
 * Called once the browser has finished uploading the file straight to Drive.
 *
 * Photos and PDFs (DOCUMENT) are reference material: they're done, no
 * processing. Recordings are first checked against our processing-time
 * estimate using the file's real size/duration — a silent Vercel timeout
 * (see processing-limits.ts) is worse than an immediate, honest "this one's
 * too big" that still leaves the reporter able to grab their original file
 * via Share.
 *
 * Drive only works out a video's duration some seconds AFTER the upload
 * finishes (and never does for audio), so at this instant it's usually
 * missing. The browser can read it straight off the file as soon as it's
 * picked, so it sends that along; Drive's own value wins when it has one.
 */
export async function finalizeUpload(
  assetId: string,
  driveFileId: string,
  user: CurrentUser,
  clientDurationSeconds: number | null = null,
) {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  // A resumed upload (or a finish whose reply was lost) can report in twice; the second time must not restart processing.
  if (asset.status !== "UPLOADING") return asset;

  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const driveStats = await getFileStats(auth, driveFileId);

  if (asset.type === "DOCUMENT") {
    return prisma.asset.update({
      where: { id: assetId },
      data: { sourceFile: driveFileId, fileSizeBytes: driveStats.fileSizeBytes, status: "READY" },
    });
  }

  const stats = { ...driveStats, durationSeconds: driveStats.durationSeconds ?? clientDurationSeconds };

  if (exceedsProcessingLimit(stats)) {
    const estimatedSeconds = Math.round(estimateProcessingSeconds(stats));
    return prisma.asset.update({
      where: { id: assetId },
      data: {
        sourceFile: driveFileId,
        duration: stats.durationSeconds,
        fileSizeBytes: stats.fileSizeBytes,
        status: "ERROR",
        errorMessage: `This recording is too long/large to process automatically right now (estimated ~${estimatedSeconds}s to process). The file is already safely saved — tap Share to grab the original, or trim it and try again.`,
      },
    });
  }

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: {
      sourceFile: driveFileId,
      duration: stats.durationSeconds,
      fileSizeBytes: stats.fileSizeBytes,
      status: "TRANSCRIBING",
    },
  });

  after(() => downloadAndProcessTranscription(assetId, driveFileId, user));

  return updated;
}

/**
 * Shared by the per-project upload route and quick capture — both just need
 * "given a project and form data, create the asset." Throws AssetUploadError
 * with an HTTP status for the caller to translate into a response.
 */
export async function createAssetFromFormData(
  projectId: string,
  formData: FormData,
  user: CurrentUser,
) {
  const file = formData.get("file");
  const text = formData.get("text");
  const type = formData.get("type");

  if (type !== "AUDIO" && type !== "VIDEO" && type !== "DOCUMENT" && type !== "NOTE") {
    throw new AssetUploadError("type must be AUDIO, VIDEO, DOCUMENT, or NOTE", 400);
  }
  if (type === "NOTE") {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new AssetUploadError("Missing note text", 400);
    }
  } else if (!(file instanceof File)) {
    throw new AssetUploadError("Missing file", 400);
  }

  const asset = await prisma.asset.create({
    data: { projectId, type, sourceFile: "", status: "UPLOADING" },
  });

  try {
    return type === "AUDIO" || type === "VIDEO"
      ? await handleMediaUpload(asset, file as File, user)
      : type === "DOCUMENT"
        ? await handleDocumentUpload(asset, file as File, user)
        : await handleNoteUpload(asset, text as string, user);
  } catch (err) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
    console.error("Asset upload failed:", err);
    throw new AssetUploadError("Upload failed", 500);
  }
}
