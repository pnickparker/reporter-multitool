"use client";

import { useEffect, useState } from "react";

/**
 * What a reporter sees while a recording is being processed. The transcription
 * service reports no percentage, so there is deliberately no percentage bar —
 * an invented one would crawl to 99% and sit there. Instead: the real step it
 * is on, a live timer, how long this usually takes for a recording this size,
 * and the thing worth knowing most: they can close the app and it carries on.
 */
export function ProcessingProgress({
  status,
  startedAt,
  typicalSeconds,
}: {
  status: "TRANSCRIBING" | "GENERATING";
  /** ISO time processing started. */
  startedAt: string;
  /** What this usually takes, in seconds, or null when unknown. */
  typicalSeconds: number | null;
}) {
  // Counted on the phone's clock after the page loads (the server has no business ticking a timer).
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const steps: { label: string; state: "done" | "active" | "waiting" }[] = [
    { label: "Uploaded", state: "done" },
    { label: "Transcribing", state: status === "TRANSCRIBING" ? "active" : "done" },
    { label: "Finding best moments and drafting posts", state: status === "GENERATING" ? "active" : "waiting" },
  ];

  const clock =
    elapsed === null ? "" : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const minutes = typicalSeconds === null ? null : Math.max(1, Math.ceil(typicalSeconds / 60));
  const slow = elapsed !== null && typicalSeconds !== null && elapsed > typicalSeconds * 1.5 + 30;

  return (
    <div role="status" className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
      <ol className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2.5">
            {step.state === "done" ? (
              <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-mint text-[10px] font-bold text-ground">
                ✓
              </span>
            ) : step.state === "active" ? (
              <span aria-hidden="true" className="h-4 w-4 animate-pulse rounded-full border-2 border-violet-soft bg-violet-soft/30" />
            ) : (
              <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-line" />
            )}
            <span className={step.state === "waiting" ? "text-muted" : step.state === "active" ? "font-semibold" : ""}>
              {step.label}
              {step.state === "active" && clock && <span className="ml-2 font-normal text-muted">{clock}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-5 text-muted">
        {minutes !== null && <>Usually about {minutes === 1 ? "a minute" : `${minutes} minutes`} for a recording like this. </>}
        {slow && <span className="text-butter">Taking a little longer than usual — it&apos;s still working. </span>}
        You can close the app: it keeps going, and the results will be here when you come back.
      </p>
    </div>
  );
}
