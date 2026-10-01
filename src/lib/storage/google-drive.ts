import { Readable } from "node:stream";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { StorageProvider, UploadFileInput, UploadedFile } from "./types";

const APP_FOLDER_NAME = "Reporter Multi-Tool";

export class GoogleDriveStorage implements StorageProvider {
  constructor(
    private readonly auth: OAuth2Client,
    private readonly folderId: string,
  ) {}

  async uploadFile({ fileName, mimeType, data }: UploadFileInput): Promise<UploadedFile> {
    const drive = google.drive({ version: "v3", auth: this.auth });
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [this.folderId],
      },
      media: {
        mimeType,
        body: Readable.from(data),
      },
      fields: "id, webViewLink",
    });
    return { id: res.data.id!, webViewLink: res.data.webViewLink ?? undefined };
  }
}

/**
 * Starts a Drive resumable upload session and returns the session URL the
 * browser can PUT file bytes to directly — bypassing our own server (and its
 * platform request-body-size limit) for large audio/video files. Only the
 * small JSON metadata request goes through googleapis here; the file bytes
 * never pass through this process.
 */
export async function createResumableUploadSession(
  auth: OAuth2Client,
  { fileName, mimeType, folderId }: { fileName: string; mimeType: string; folderId: string },
): Promise<string> {
  const { token } = await auth.getAccessToken();
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
    },
    body: JSON.stringify({ name: fileName, parents: [folderId] }),
  });

  if (!res.ok) {
    throw new Error(`Failed to start Drive resumable upload session: ${res.status} ${await res.text()}`);
  }

  const location = res.headers.get("Location");
  if (!location) throw new Error("Drive did not return a resumable upload session URL");
  return location;
}

/** Downloads a Drive file's bytes — used to feed transcription for files uploaded via the resumable session above, since those bytes never passed through our server on the way in. */
export async function downloadFile(auth: OAuth2Client, fileId: string): Promise<Buffer> {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

/** File size (and video duration, when Drive has it — not exposed for audio) for a just-uploaded file, read before committing to transcribe it. */
export async function getFileStats(
  auth: OAuth2Client,
  fileId: string,
): Promise<{ fileSizeBytes: number | null; durationSeconds: number | null }> {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get({ fileId, fields: "size, videoMediaMetadata" });
  return {
    fileSizeBytes: res.data.size ? Number(res.data.size) : null,
    durationSeconds: res.data.videoMediaMetadata?.durationMillis
      ? Math.round(Number(res.data.videoMediaMetadata.durationMillis) / 1000)
      : null,
  };
}

/**
 * Finds the app's folder in the user's Drive, creating it if it doesn't exist yet.
 * Called once during the OAuth connect flow — `drive.file` scope only grants
 * access to files/folders the app itself creates, so this folder must exist
 * before any upload can target it.
 */
export async function findOrCreateAppFolder(auth: OAuth2Client): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  const existing = await drive.files.list({
    q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return created.data.id!;
}
