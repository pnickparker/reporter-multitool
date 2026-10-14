"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface MediaContextValue {
  hasMedia: boolean;
  register: (el: HTMLMediaElement | null) => void;
  /** Jump to a moment and play; with `endSeconds`, stop at the end of the quote instead of playing on. */
  seek: (seconds: number, endSeconds?: number | null) => void;
  /** True from a tap until playback actually starts (a big video can take a few seconds). */
  loading: boolean;
}

/** Start a little before the quote and stop a little after it, so the first and last words aren't clipped. */
const LEAD_IN_SECONDS = 0.4;
const TAIL_SECONDS = 0.6;
/** How long to wait for a jump to land before playing anyway. */
const SEEK_WAIT_LIMIT_MS = 12000;

const MediaContext = createContext<MediaContextValue | null>(null);

/**
 * Ties one recording's player to the quote timestamps beside it, so tapping
 * "0:09" on a quote jumps the player there. Wrap an asset's player and its
 * quotes in one of these.
 */
export function MediaScope({ hasMedia, children }: { hasMedia: boolean; children: ReactNode }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const programmaticSeekRef = useRef(false);
  const seekTokenRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(false);

  // Listens to the player so "Loading…" is honest and a quote's stop point is dropped if the listener takes over.
  const register = useCallback((el: HTMLMediaElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    mediaRef.current = el;
    if (!el) return;

    const playing = () => setLoading(false);
    const waiting = () => setLoading(true);
    const stopped = () => {
      setLoading(false);
      if (el.paused) stopAtRef.current = null;
    };
    const seeking = () => {
      // A seek we didn't make (the listener dragging the slider) cancels "stop at the end of the quote".
      if (programmaticSeekRef.current) programmaticSeekRef.current = false;
      else stopAtRef.current = null;
    };
    // timeupdate only fires a few times a second, so watch the clock more closely while a quote is playing.
    const watch = setInterval(() => {
      const stopAt = stopAtRef.current;
      if (stopAt !== null && !el.paused && el.currentTime >= stopAt) {
        el.pause();
        stopAtRef.current = null;
      }
    }, 80);

    el.addEventListener("playing", playing);
    el.addEventListener("waiting", waiting);
    el.addEventListener("pause", stopped);
    el.addEventListener("ended", stopped);
    el.addEventListener("error", stopped);
    el.addEventListener("seeking", seeking);
    cleanupRef.current = () => {
      clearInterval(watch);
      el.removeEventListener("playing", playing);
      el.removeEventListener("waiting", waiting);
      el.removeEventListener("pause", stopped);
      el.removeEventListener("ended", stopped);
      el.removeEventListener("error", stopped);
      el.removeEventListener("seeking", seeking);
    };
  }, []);

  const value = useMemo<MediaContextValue>(
    () => ({
      hasMedia,
      register,
      loading,
      seek: (seconds, endSeconds) => {
        const el = mediaRef.current;
        if (!el) return;
        // Stop whatever is playing, and make a newer tap win over an older one still waiting.
        el.pause();
        const token = ++seekTokenRef.current;
        stopAtRef.current = null;
        setLoading(true);

        const target = Math.max(0, seconds - LEAD_IN_SECONDS);
        const startPlayback = () => {
          if (token !== seekTokenRef.current) return;
          stopAtRef.current = typeof endSeconds === "number" && endSeconds > seconds ? endSeconds + TAIL_SECONDS : null;
          // Called from a tap, so browsers allow playback to start.
          void el.play().catch(() => setLoading(false));
        };

        // Playing before the jump has landed makes a big video start from where it was, then lurch to the quote.
        // So: jump, wait until the player says it got there, and only then play.
        if (Math.abs(el.currentTime - target) < 0.05 && el.readyState >= 3) {
          startPlayback();
          return;
        }
        programmaticSeekRef.current = true;
        const waiter = { fallback: undefined as ReturnType<typeof setTimeout> | undefined };
        const onSeeked = () => {
          clearTimeout(waiter.fallback);
          startPlayback();
        };
        el.addEventListener("seeked", onSeeked, { once: true });
        // If the jump never reports back (a stalled connection), try playing anyway rather than hang.
        waiter.fallback = setTimeout(() => {
          el.removeEventListener("seeked", onSeeked);
          startPlayback();
        }, SEEK_WAIT_LIMIT_MS);
        el.currentTime = target;
      },
    }),
    [hasMedia, register, loading],
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
      {ctx?.loading && (
        <p role="status" className="px-2 pb-1 pt-2 text-xs text-muted">
          Loading — a large video can take a few seconds to start from here.
        </p>
      )}
    </div>
  );
}

/** A quote's timestamp — a tap-to-play button when there's a player beside it, plain text otherwise. */
export function SeekChip({ seconds, endSeconds, label }: { seconds: number; endSeconds?: number | null; label: string }) {
  const ctx = useContext(MediaContext);

  if (!ctx?.hasMedia) {
    return <span className="rounded-full bg-line px-2.5 py-1 text-xs text-violet-100">at {label}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => ctx.seek(seconds, endSeconds)}
      aria-label={endSeconds ? `Play this quote, from ${label}` : `Play from ${label}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-line px-4 text-xs font-medium text-violet-100 hover:brightness-125"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M2 1l9 5-9 5z" />
      </svg>
      {label}
    </button>
  );
}
