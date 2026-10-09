"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { saveNote, uploadFile } from "@/lib/client/upload";

interface CaptureActionsProps {
  /** "/api/quick-capture" (starts a new project) or "/api/projects/<id>/assets" (adds to that project). */
  endpoint: string;
  /** After saving, open the project it landed in (Home, /capture) instead of refreshing the page you're on. */
  goToProject?: boolean;
  /** "hero" is the violet card on Home; "card" is the compact one on a project page. */
  layout: "hero" | "card";
  initialNoteOpen?: boolean;
}

function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/**
 * The ways to add something: Camera (opens the phone's camera directly —
 * photo or video — and uploads the moment you finish), Note (type or paste
 * text), and Upload (any recording, photo, or PDF already on the phone). What
 * kind of thing a file is gets worked out from the file itself.
 */
export function CaptureActions({ endpoint, goToProject = false, layout, initialNoteOpen = false }: CaptureActionsProps) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(initialNoteOpen);
  const [noteText, setNoteText] = useState("");

  async function run(work: () => Promise<{ projectId: string }>) {
    setBusy(true);
    setError(null);
    try {
      const { projectId } = await work();
      setNoteText("");
      setNoteOpen(false);
      if (goToProject) {
        router.push(`/projects/${projectId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
      // Cleared only now: resetting an input early can invalidate the picked file on some phones.
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void run(() => uploadFile(file, endpoint, setProgress));
  }

  function onSaveNote() {
    if (noteText.trim().length === 0) {
      setError("Type or paste a note first");
      return;
    }
    void run(() => saveNote(noteText, endpoint));
  }

  const hero = layout === "hero";

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={onFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={uploadRef}
        type="file"
        accept="video/*,audio/*,image/*,application/pdf"
        onChange={onFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );

  const progressPanel = busy && (
    <div
      role="status"
      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${hero ? "bg-black/20" : "bg-surface-2"}`}
    >
      <div className="flex items-center gap-2.5 font-medium">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-mint" />
        {progress ?? "Saving…"}
      </div>
      <p className={`mt-1 text-xs ${hero ? "text-violet-100" : "text-muted"}`}>
        Keep this screen open until it finishes.
      </p>
    </div>
  );

  const notePanel =
    noteOpen && !busy ? (
      <div className="mt-3">
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type or paste a note…"
          aria-label="Note"
          rows={4}
          className={
            hero
              ? "w-full rounded-2xl bg-white/15 px-4 py-3 text-base text-white outline-none ring-1 ring-white/30 placeholder:text-violet-100 focus:ring-2 focus:ring-white"
              : "field"
          }
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveNote}
            className={
              hero
                ? "inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-violet hover:brightness-95"
                : "btn-primary"
            }
          >
            Save note
          </button>
          <button
            type="button"
            onClick={() => {
              setNoteOpen(false);
              setError(null);
            }}
            className={
              hero
                ? "inline-flex min-h-11 items-center px-4 text-sm font-medium text-violet-100 hover:text-white"
                : "btn-ghost"
            }
          >
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  const errorLine = error && (
    <p
      className={`mt-3 text-sm ${hero ? "rounded-2xl bg-black/25 px-3 py-2 text-white" : "text-danger"}`}
    >
      {error}
    </p>
  );

  if (hero) {
    return (
      <section className="mt-5 rounded-[28px] bg-violet p-5 text-white">
        {inputs}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-extrabold">Start capturing</h3>
            <p className="mt-1 text-sm leading-5 text-violet-100">
              Opens your camera, photo or video. Transcript and best moments follow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            aria-label="Open the camera"
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white disabled:opacity-60"
          >
            <span className="block h-7 w-7 rounded-full bg-violet" />
          </button>
        </div>
        {progressPanel}
        {!busy && (
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => setNoteOpen((open) => !open)}
              className="inline-flex min-h-11 items-center rounded-full bg-white/20 px-5 text-[15px] font-medium hover:bg-white/30"
            >
              Note
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="inline-flex min-h-11 items-center rounded-full bg-white/20 px-5 text-[15px] font-medium hover:bg-white/30"
            >
              Upload
            </button>
          </div>
        )}
        {notePanel}
        {errorLine}
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-surface p-4">
      {inputs}
      <h3 className="font-display text-lg font-extrabold">Add to this project</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="btn-primary gap-2"
        >
          <CameraIcon />
          Camera
        </button>
        <button type="button" onClick={() => setNoteOpen((open) => !open)} disabled={busy} className="btn-secondary">
          Note
        </button>
        <button type="button" onClick={() => uploadRef.current?.click()} disabled={busy} className="btn-secondary">
          Upload
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Upload takes a recording, photo, or PDF already on your phone.
      </p>
      {progressPanel}
      {notePanel}
      {errorLine}
    </section>
  );
}
