import { after } from "next/server";
import type { Asset, GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { GoogleDriveStorage } from "@/lib/storage/google-drive";
import { processTranscription } from "@/lib/transcription/process";
import { errorMessage } from "@/lib/error-message";

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
