"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface MediaContextValue {
  hasMedia: boolean;
  register: (el: HTMLMediaElement | null) => void;
  seek: (seconds: number) => void;
}

const MediaContext = createContext<MediaContextValue | null>(null);

/**
 * Ties one recording's player to the quote timestamps beside it, so tapping
 * "0:09" on a quote jumps the player there. Wrap an asset's player and its
 * quotes in one of these.
 */
export function MediaScope({ hasMedia, children }: { hasMedia: boolean; children: ReactNode }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const value = useMemo<MediaContextValue>(
    () => ({
      hasMedia,
      register: (el) => {
        mediaRef.current = el;
      },
      seek: (seconds) => {
        const el = mediaRef.current;
        if (!el) return;
        el.currentTime = seconds;
        // Called from a tap, so browsers allow playback to start.
        void el.play().catch(() => {});
      },
    }),
    [hasMedia],
  );

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

/** The recording itself, played through our own server. Stays pinned near the top while you read the quotes below it. */
export function MediaPlayer({ assetId, kind }: { assetId: string; kind: "AUDIO" | "VIDEO" }) {
  const ctx = useContext(MediaContext);
  const [failed, setFailed] = useState(false);
  const src = `/api/assets/${assetId}/stream`;

  if (failed) {
    return (
      <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
        This file can&rsquo;t be played here — use Share to open it in another app.
      </p>
    );
  }

  return (
    <div className="sticky top-2 z-10 mt-3 rounded-2xl bg-surface-2 p-2 shadow-lg shadow-black/30">
      {kind === "VIDEO" ? (
        <video
          ref={ctx?.register}
          src={`${src}#t=0.1`}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="max-h-[40vh] w-full rounded-xl bg-black object-contain"
        />
      ) : (
        <audio
          ref={ctx?.register}
          src={src}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
          className="w-full"
        />
      )}
    </div>
  );
}

/** A quote's timestamp — a tap-to-play button when there's a player beside it, plain text otherwise. */
export function SeekChip({ seconds, label }: { seconds: number; label: string }) {
  const ctx = useContext(MediaContext);

  if (!ctx?.hasMedia) {
    return <span className="rounded-full bg-line px-2.5 py-1 text-xs text-violet-100">at {label}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => ctx.seek(seconds)}
      aria-label={`Play from ${label}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-line px-4 text-xs font-medium text-violet-100 hover:brightness-125"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M2 1l9 5-9 5z" />
      </svg>
      {label}
    </button>
  );
}
