"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/** UI-level grouping — Audio and Video share one picker since a video recording captures audio too, and the OS camera app is the only reliable native recorder file inputs can reach. The actual AssetType (AUDIO vs VIDEO) is inferred server-side from the picked file's MIME type. */
type UiType = "MEDIA" | "DOCUMENT" | "NOTE";

const UI_TYPE_LABELS: Record<UiType, string> = {
  MEDIA: "Audio/Video",
  DOCUMENT: "Document",
  NOTE: "Note",
};

const ACCEPT_BY_UI_TYPE: Record<Exclude<UiType, "NOTE">, string> = {
  MEDIA: "video/*,audio/*",
  DOCUMENT: "image/*,application/pdf",
};

/**
 * Reads a recording's length straight from the file in the browser — it only
 * needs the header, so it's quick even for a big video. The server uses it to
 * estimate processing time (Drive doesn't know a video's length until a while
 * after upload, and never knows an audio file's). Gives up after a few
 * seconds and returns null rather than hold up the upload.
 */
function readMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
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

interface UploadAssetFormProps {
  /** Where to POST the form data — a per-project upload or /api/quick-capture. */
  endpoint: string;
  /** Called with the created asset on success, instead of the default router.refresh(). */
  onSuccess?: (asset: { projectId: string }) => void;
}

export function UploadAssetForm({ endpoint, onSuccess }: UploadAssetFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uiType, setUiType] = useState<UiType>("MEDIA");
  const [noteText, setNoteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNoteText("");
    setFileName(null);
  }

  /**
   * Audio/video goes straight from the browser to Drive via a resumable
   * upload session — Vercel's serverless functions cap request bodies at a
   * few MB, far below a typical phone recording, so the file's bytes can
   * never pass through our own server on the way in.
   */
  // Multiple of 256KB as Google's resumable upload protocol requires for
  // all but the final chunk, and safely under Vercel's ~4.5MB request body
  // limit (Google's endpoint itself refuses direct cross-origin browser
  // uploads, so chunks are relayed through our own same-origin server).
  const CHUNK_SIZE = 4 * 1024 * 1024;

  async function submitMedia(file: File) {
    setProgressLabel("Starting upload…");
    const durationSeconds = await readMediaDuration(file);
    const initRes = await fetch(`${endpoint}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream" }),
    });
    if (!initRes.ok) {
      const data = await initRes.json().catch(() => ({}));
      throw new Error(data.error ?? "Couldn't start upload");
    }
    const { assetId, uploadUrl, projectId } = await initRes.json();

    let driveFile: { id: string } | null = null;
    let start = 0;
    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
      setProgressLabel(`Uploading… ${Math.round((start / file.size) * 100)}%`);

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
    if (!driveFile) {
      throw new Error("Upload to Drive failed partway through — try again");
    }

    setProgressLabel("Finishing up…");
    const finalizeRes = await fetch(`/api/assets/${assetId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFileId: driveFile.id, durationSeconds }),
    });
    if (!finalizeRes.ok) {
      const data = await finalizeRes.json().catch(() => ({}));
      throw new Error(data.error ?? "Upload finished but couldn't be saved");
    }

    return { ...(await finalizeRes.json()), projectId };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (uiType === "NOTE") {
      if (noteText.trim().length === 0) {
        setError("Type or paste a note first");
        return;
      }
    } else if (!fileInputRef.current?.files?.[0]) {
      setError("Choose a file first");
      return;
    }

    setUploading(true);

    try {
      let result: { projectId: string };

      if (uiType === "MEDIA") {
        result = await submitMedia(fileInputRef.current!.files![0]);
      } else if (uiType === "NOTE") {
        const formData = new FormData();
        formData.append("type", "NOTE");
        formData.append("text", noteText);
        const res = await fetch(endpoint, { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        result = await res.json();
      } else {
        const formData = new FormData();
        formData.append("type", "DOCUMENT");
        formData.append("file", fileInputRef.current!.files![0]);
        const res = await fetch(endpoint, { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        result = await res.json();
      }

      resetForm();
      if (onSuccess) {
        onSuccess(result);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgressLabel(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
    >
      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(UI_TYPE_LABELS) as UiType[]).map((t) => (
          <label key={t} className="flex items-center gap-1">
            <input type="radio" checked={uiType === t} onChange={() => setUiType(t)} />
            {UI_TYPE_LABELS[t]}
          </label>
        ))}
      </div>
      {uiType === "NOTE" ? (
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type or paste a note…"
          rows={4}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="asset-file-input"
            className="cursor-pointer rounded border border-dashed border-zinc-400 px-4 py-6 text-center text-base font-medium text-zinc-700 hover:border-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-400 dark:hover:bg-zinc-800"
          >
            {fileName ?? "Create or Select New File"}
          </label>
          <input
            id="asset-file-input"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_BY_UI_TYPE[uiType]}
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={uploading}
        className="mt-4 self-start rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {uploading ? (progressLabel ?? "Saving…") : uiType === "NOTE" ? "Save note" : "Upload"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
