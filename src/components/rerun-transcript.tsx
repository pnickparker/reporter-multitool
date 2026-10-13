"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Speaker labels look wrong?" — runs the transcript again with a different
 * idea of how many people are talking. Telling voices apart is an educated guess
 * that can miss either way (two voices merged into one, one split in two), and
 * the reporter, who knows who was in the room, can correct it. The earlier results are
 * kept until the new transcript is ready, and restored if the re-run can't finish.
 */
export function RerunTranscript({ assetId, typicalMinutes }: { assetId: string; typicalMinutes: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rerun() {
    const sure = window.confirm(
      "Re-run this transcript?\n\nThe transcript, best moments and post drafts will be replaced with a new run. If it can't finish, your current ones are kept.",
    );
    if (!sure) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rerun: true, speakers: choice === "auto" ? "auto" : Number(choice) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't start the re-run");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the re-run");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link-action -ml-2 mt-1 text-violet-soft">
        Speaker labels look wrong? Re-run…
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
      <label className="flex flex-col gap-1.5 font-medium text-muted">
        How many people are talking?
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className="field">
          <option value="auto">Let it work it out</option>
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n} people
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs leading-5 text-muted">
        Telling voices apart is a best guess. Pick the number you know was in the room and run it again
        {typicalMinutes !== null && <> (usually about {typicalMinutes === 1 ? "a minute" : `${typicalMinutes} minutes`})</>}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void rerun()} disabled={busy} className="btn-primary">
          {busy ? "Starting…" : "Re-run transcript"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-ghost">
          Cancel
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}
