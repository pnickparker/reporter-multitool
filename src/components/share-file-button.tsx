"use client";

import { useEffect, useState } from "react";

/**
 * Native OS share sheet (AirDrop/Messages/Mail/Save to Files/etc.) for an
 * asset's original source file, via the Web Share API — supported on
 * mobile Safari and Android Chrome from a real tap, not on desktop
 * browsers. Renders nothing when unsupported, so the existing "Drive file:
 * open" link stays as the fallback there.
 *
 * Two taps, not one: Safari only allows navigator.share() when called
 * synchronously within a user gesture, with no `await` beforehand — but
 * fetching the file is necessarily async. So the first tap fetches and
 * prepares the file, and the second tap (a fresh, synchronous gesture)
 * actually opens the share sheet.
 */
export function ShareFileButton({ assetId }: { assetId: string }) {
  const [supported, setSupported] = useState(false);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Must run post-mount, not during the initial render, so the server-rendered
    // (navigator-less) HTML matches the client's hydration pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!navigator.share && !!navigator.canShare);
  }, []);

  if (!supported) return null;

  async function prepareFile() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/file`);
      if (!res.ok) throw new Error("Couldn't fetch file");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const asciiName = disposition.match(/filename="([^"]+)"/)?.[1];
      const fileName = (utf8Name && decodeURIComponent(utf8Name)) || asciiName || "file";
      const file = new File([blob], fileName, { type: blob.type });

      if (!navigator.canShare({ files: [file] })) {
        throw new Error("Sharing this file type isn't supported on this device");
      }
      setPreparedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare file");
    } finally {
      setBusy(false);
    }
  }

  function handleClick() {
    if (preparedFile) {
      // Called synchronously, directly from this click — no await before
      // it — so Safari still sees it as a real user gesture.
      navigator.share({ files: [preparedFile] }).catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Share failed");
      });
      setPreparedFile(null);
      return;
    }
    void prepareFile();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs font-medium text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-400"
      >
        {busy ? "Preparing…" : preparedFile ? "Tap to share" : "Share"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
