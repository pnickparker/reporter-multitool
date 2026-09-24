"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AssetType = "AUDIO" | "VIDEO" | "DOCUMENT" | "NOTE";

const TYPE_LABELS: Record<AssetType, string> = {
  AUDIO: "Audio",
  VIDEO: "Video",
  DOCUMENT: "Document",
  NOTE: "Note",
};

const ACCEPT_BY_TYPE: Record<Exclude<AssetType, "NOTE">, string> = {
  AUDIO: "audio/*",
  VIDEO: "video/*",
  DOCUMENT: "image/*,application/pdf",
};

export function UploadAssetForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AssetType>("AUDIO");
  const [noteText, setNoteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("type", type);

    if (type === "NOTE") {
      if (noteText.trim().length === 0) {
        setError("Type or paste a note first");
        return;
      }
      formData.append("text", noteText);
    } else {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError("Choose a file first");
        return;
      }
      formData.append("file", file);
    }

    setUploading(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setNoteText("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
    >
      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.keys(TYPE_LABELS) as AssetType[]).map((t) => (
          <label key={t} className="flex items-center gap-1">
            <input type="radio" checked={type === t} onChange={() => setType(t)} />
            {TYPE_LABELS[t]}
          </label>
        ))}
      </div>
      {type === "NOTE" ? (
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type or paste a note…"
          rows={4}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : (
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_BY_TYPE[type]}
          className="text-sm"
        />
      )}
      <button
        type="submit"
        disabled={uploading}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {uploading ? "Saving…" : type === "NOTE" ? "Save note" : "Upload to Drive"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
