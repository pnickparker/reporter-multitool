"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AssetType = "AUDIO" | "VIDEO" | "DOCUMENT" | "NOTE";

/** UI-level grouping — Audio and Video share one picker since a video recording captures audio too, and the OS camera app is the only reliable native recorder file inputs can reach. The actual AssetType (AUDIO vs VIDEO) is inferred from the picked file's MIME type at submit time. */
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

function mediaAssetType(file: File): AssetType {
  return file.type.startsWith("audio/") ? "AUDIO" : "VIDEO";
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const formData = new FormData();

    if (uiType === "NOTE") {
      if (noteText.trim().length === 0) {
        setError("Type or paste a note first");
        return;
      }
      formData.append("type", "NOTE");
      formData.append("text", noteText);
    } else {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError("Choose a file first");
        return;
      }
      formData.append("type", uiType === "MEDIA" ? mediaAssetType(file) : "DOCUMENT");
      formData.append("file", file);
    }

    setUploading(true);
    setError(null);

    const res = await fetch(endpoint, { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setNoteText("");
    setFileName(null);

    if (onSuccess) {
      onSuccess(await res.json());
    } else {
      router.refresh();
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
        {uploading ? "Saving…" : uiType === "NOTE" ? "Save note" : "Upload"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
