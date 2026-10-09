"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/** UI-level grouping — Audio and Video share one picker since a video recording captures audio too, and the OS camera app is the only reliable native recorder file inputs can reach. The actual AssetType (AUDIO vs VIDEO) is inferred server-side from the picked file's MIME type. */
export type UiType = "MEDIA" | "DOCUMENT" | "NOTE";

const UI_TYPE_LABELS: Record<UiType, string> = {
  MEDIA: "Audio/Video",
  DOCUMENT: "Document",
  NOTE: "Note",
};

const ACCEPT_BY_UI_TYPE: Record<Exclude<UiType, "NOTE">, string> = {
  MEDIA: "video/*,audio/*",
  DOCUMENT: "image/*,application/pdf",
};

interface UploadAssetFormProps {
  /** Where to POST the form data — a per-project upload or /api/quick-capture. */
  endpoint: string;
  /** Called with the created asset on success, instead of the default router.refresh(). */
  onSuccess?: (asset: { projectId: string }) => void;
  /** Which type is selected first — the Home page's Note/Document shortcuts pass this. */
  initialType?: UiType;
}

export function UploadAssetForm({ endpoint, onSuccess, initialType = "MEDIA" }: UploadAssetFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uiType, setUiType] = useState<UiType>(initialType);
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
      body: JSON.stringify({ driveFileId: driveFile.id }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl bg-surface p-4">
      <div role="radiogroup" aria-label="What are you adding?" className="flex rounded-full bg-ground p-1">
        {(Object.keys(UI_TYPE_LABELS) as UiType[]).map((t) => (
          <label
            key={t}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-medium text-muted has-[:checked]:bg-violet has-[:checked]:font-bold has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-violet-soft"
          >
            <input
              type="radio"
              name="asset-type"
              checked={uiType === t}
              onChange={() => setUiType(t)}
              className="sr-only"
            />
            {UI_TYPE_LABELS[t]}
          </label>
        ))}
      </div>
      {uiType === "NOTE" ? (
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type or paste a note…"
          aria-label="Note"
          rows={4}
          className="field"
        />
      ) : (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="asset-file-input"
            className="cursor-pointer rounded-2xl border-2 border-dashed border-line px-4 py-7 text-center text-base font-medium text-violet-soft hover:border-violet-soft"
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
      <button type="submit" disabled={uploading} className="btn-primary self-start px-7">
        {uploading ? (progressLabel ?? "Saving…") : uiType === "NOTE" ? "Save note" : "Upload"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
