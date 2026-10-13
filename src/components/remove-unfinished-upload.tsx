"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** For an upload that never finished: nothing to open, nothing to retry from this screen — just clear the placeholder away. */
export function RemoveUnfinishedUpload({ assetId, projectRemainsWithOthers }: { assetId: string; projectRemainsWithOthers: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const sure = window.confirm(
      "Remove this unfinished upload?\n\nNo recording is stored here — this only clears the leftover. If an upload is still running on a phone, it will fail.",
    );
    if (!sure) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't remove it");
      const result = await res.json();
      if (result.projectRemoved) router.push("/");
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove it");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => void remove()} disabled={busy} className="btn-secondary">
        {busy ? "Removing…" : projectRemainsWithOthers ? "Remove this unfinished upload" : "Remove this leftover"}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
    </div>
  );
}
