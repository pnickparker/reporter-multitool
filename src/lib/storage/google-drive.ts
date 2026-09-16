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
