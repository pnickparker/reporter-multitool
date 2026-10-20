"use client";

import { useEffect, useState } from "react";

/**
 * Gets the transcript / quotes / post-draft text package out of the app
 * WITHOUT navigating away from it. A plain download link made iPhones open the
 * file full-screen with no way back (a tester had to close the app and start
 * over), so this fetches the text and hands it to the phone's share sheet
 * (Messages, Mail, Notes, copy…), or on desktop downloads it from the page.
 *
 * Two taps on a phone: Safari only allows the share sheet straight from a tap
 * with no waiting beforehand, and fetching is async — so the first tap
 * prepares the text and the second opens the sheet (same approach as the Share
 * button for the original file).
 */
export function ExportTextButton({
  href,
  label = "Export text",
  title,
  mimeType = "text/markdown",
  fallbackName = "export.md",
}: {
  /** Endpoint that returns the markdown, e.g. /api/assets/<id>/export. */
  href: string;
  label?: string;
  /** Used as the share sheet's subject line. */
  title: string;
  /** Type of the downloaded file, when it isn't markdown. */
  mimeType?: string;
  /** File name to use if the endpoint doesn't send one. */
  fallbackName?: string;
}) {
  const [canShare, setCanShare] = useState(false);
  const [prepared, setPrepared] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Post-mount so the server-rendered HTML matches hydration (the server has no navigator).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.share === "function");
  }, []);

  async function fetchText() {
    const res = await fetch(href);
    if (!res.ok) throw new Error("Couldn't prepare the export");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
    return { text: await res.text(), fileName };
  }

  function downloadHere(text: string, fileName: string) {
    const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const { text, fileName } = await fetchText();
      if (canShare) setPrepared(text);
      else downloadHere(text, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare the export");
    } finally {
      setBusy(false);
    }
  }

  function handleClick() {
    if (prepared !== null) {
      // Straight from the tap, nothing awaited first, so the phone still counts it as a real gesture.
      navigator.share({ title, text: prepared }).catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Couldn't open the share sheet");
      });
      setPrepared(null);
      return;
    }
    void prepare();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleClick} disabled={busy} className="link-action text-violet-soft">
        {busy ? "Preparing…" : prepared !== null ? "Tap to share" : label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
