/**
 * Keeps the phone's screen on while an upload runs — a locked phone suspends
 * the page and stalls the upload. The screen-wake request is dropped by the
 * browser whenever the page is hidden, so it is asked for again on return.
 * Does nothing where the browser doesn't offer it. Returns a function that lets
 * the screen sleep again.
 */
export function keepScreenAwake(): () => void {
  type WakeLockSentinelLike = { release: () => Promise<void> };
  const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } })
    .wakeLock;
  if (!wakeLock) return () => {};

  let sentinel: WakeLockSentinelLike | null = null;
  let stopped = false;

  const acquire = async () => {
    try {
      const next = await wakeLock.request("screen");
      if (stopped) await next.release();
      else sentinel = next;
    } catch {
      // Refused (low battery, not allowed here) — the upload carries on without it.
    }
  };
  const onVisible = () => {
    if (document.visibilityState === "visible" && !stopped) void acquire();
  };

  void acquire();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
  };
}
