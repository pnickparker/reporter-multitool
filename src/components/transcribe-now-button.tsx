"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** For a recording that's saved but has no transcript yet: starts processing it again with a fresh time allowance. */
export function TranscribeNowButton({ assetId, label = "Transcribe now" }: { assetId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/reprocess`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't start");
      router.refresh(); // the item now shows as transcribing, and the page keeps checking until it's done
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void start()} disabled={busy} className="btn-secondary">
        {busy ? "Starting…" : label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
