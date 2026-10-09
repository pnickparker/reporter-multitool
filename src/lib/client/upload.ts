/**
 * Browser-side upload logic shared by every place a file or note can be
 * added (the Home capture card, /capture, and a project's "Add" card).
 */

// Multiple of 256KB as Google's resumable upload protocol requires for all
// but the final chunk, and safely under Vercel's ~4.5MB request body limit
// (Google's endpoint itself refuses direct cross-origin browser uploads, so
// chunks are relayed through our own same-origin server).
const CHUNK_SIZE = 4 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  mov: "video/quicktime",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

/** The file's MIME type, falling back to its extension when the browser doesn't report one (some phones don't). */
function resolveMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? file.type ?? "application/octet-stream";
}

/**
 * Reads a recording's length straight from the file in the browser — it only
 * needs the header, so it's quick even for a big video. The server uses it to
 * estimate processing time (Drive doesn't know a video's length until a while
 * after upload, and never knows an audio file's). Gives up after a few
 * seconds and returns null rather than hold up the upload.
 */
function readMediaDuration(file: File, mimeType: string): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(mimeType.startsWith("audio/") ? "audio" : "video");
    const finish = (value: number | null) => {
      clearTimeout(timer);
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 4000);
    media.preload = "metadata";
    media.onloadedmetadata = () =>
      finish(Number.isFinite(media.duration) && media.duration > 0 ? media.duration : null);
    media.onerror = () => finish(null);
    media.src = url;
  });
}

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error ?? fallback);
}

/**
 * Uploads a recording, photo, or PDF straight to Drive (in pieces relayed
 * through our server) and registers it. `endpoint` is either
 * "/api/quick-capture" (creates a project on the fly) or
 * "/api/projects/<id>/assets". The asset's type is worked out server-side
 * from the file's MIME type.
 */
export async function uploadFile(
  file: File,
  endpoint: string,
  onProgress: (label: string) => void,
): Promise<{ projectId: string }> {
  const mimeType = resolveMimeType(file);
  const isRecording = mimeType.startsWith("audio/") || mimeType.startsWith("video/");

  onProgress("Starting upload…");
  const durationSeconds = isRecording ? await readMediaDuration(file, mimeType) : null;

  const initRes = await fetch(`${endpoint}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType }),
  });
  if (!initRes.ok) throw await errorFrom(initRes, "Couldn't start upload");
  const { assetId, uploadUrl, projectId } = await initRes.json();

  let driveFile: { id: string } | null = null;
  let start = 0;
  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
    onProgress(`Uploading… ${Math.round((start / file.size) * 100)}%`);

    const chunkRes = await fetch("/api/uploads/chunk", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Upload-Url": uploadUrl,
        "X-Range-Start": String(start),
        "X-Range-End": String(end),
        "X-Total-Size": String(file.size),
      },
      body: file.slice(start, end + 1),
    });

    if (chunkRes.status === 308) {
      start = end + 1;
      continue;
    }
    if (chunkRes.ok) {
      driveFile = await chunkRes.json();
      break;
    }
    throw new Error("Upload to Drive failed partway through — try again");
  }
  if (!driveFile) throw new Error("Upload to Drive failed partway through — try again");

  onProgress("Finishing up…");
  const finalizeRes = await fetch(`/api/assets/${assetId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveFileId: driveFile.id, durationSeconds }),
  });
  if (!finalizeRes.ok) throw await errorFrom(finalizeRes, "Upload finished but couldn't be saved");

  return { projectId };
}

/** Saves typed or dictated text as a note — small enough to go through the server in one request. */
export async function saveNote(text: string, endpoint: string): Promise<{ projectId: string }> {
  const formData = new FormData();
  formData.append("type", "NOTE");
  formData.append("text", text);
  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) throw await errorFrom(res, "Couldn't save the note");
  return res.json();
}
