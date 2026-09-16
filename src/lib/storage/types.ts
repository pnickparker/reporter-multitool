export interface UploadFileInput {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export interface UploadedFile {
  /** Provider-specific file reference (e.g. Google Drive file ID) */
  id: string;
  webViewLink?: string;
}

export interface StorageProvider {
  uploadFile(input: UploadFileInput): Promise<UploadedFile>;
}
