"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { speakerLabel } from "@/lib/transcript-format";

/**
 * "Who's talking": one chip per speaker in the transcript. Tap one to give that
 * speaker a real name; it replaces "Speaker A" everywhere (the transcript and the
 * exported text). Telling voices apart is the service's guess, but who they are is
 * the reporter's knowledge. The transcript text itself is never changed.
 */
export function SpeakerNames({
  assetId,
  speakers,
  names,
}: {
  assetId: string;
  speakers: string[];
  names: Record<string, string>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(speaker: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/speakers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: { [speaker]: value } }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save the name");
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-2xl bg-surface-2 px-3 py-3 text-sm">
      <p className="text-xs font-medium text-muted">Who&apos;s talking? Tap a speaker to give them a name.</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {speakers.map((speaker) =>
          editing === speaker ? (
            <li key={speaker} className="flex w-full flex-wrap items-center gap-2">
              <input
                autoFocus
                value={value}
                maxLength={60}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save(speaker);
                  if (e.key === "Escape") setEditing(null);
                }}
                placeholder={`Name for Speaker ${speaker}`}
                aria-label={`Name for Speaker ${speaker}`}
                className="field min-w-0 flex-1"
              />
              <button type="button" onClick={() => void save(speaker)} disabled={busy} className="btn-primary">
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(null)} disabled={busy} className="btn-ghost">
                Cancel
              </button>
            </li>
          ) : (
            <li key={speaker}>
              <button
                type="button"
                onClick={() => {
                  setEditing(speaker);
                  setValue(names[speaker] ?? "");
                  setError(null);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-xs font-semibold text-violet-soft hover:brightness-110"
              >
                {speakerLabel(speaker, names)}
                <span aria-hidden="true" className="text-muted">✎</span>
              </button>
            </li>
          ),
        )}
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
