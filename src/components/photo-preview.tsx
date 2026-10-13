"use client";

import { useState } from "react";

/** A photo asset shown as a picture, tap to open it full size. Falls back to a note if the browser can't display the format (some phones save photos as HEIC). */
export function PhotoPreview({ assetId }: { assetId: string }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/assets/${assetId}/stream`;

  if (failed) {
    return (
      <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
        This photo can&rsquo;t be shown here — use Share to open it in another app.
      </p>
    );
  }

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="mt-3 block" aria-label="Open photo full size">
      {/* eslint-disable-next-line @next/next/no-img-element -- streamed from our own authenticated route, not a static asset */}
      <img
        src={src}
        alt="Photo added to this project"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-[60vh] w-full rounded-2xl bg-black object-contain"
      />
    </a>
  );
}
