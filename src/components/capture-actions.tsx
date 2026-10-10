"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { resolveMimeType, saveNote, uploadFile, type UploadSession } from "@/lib/client/upload";
import { listPending, removePending, savePending, saveSession } from "@/lib/client/pending-store";
import { keepScreenAwake } from "@/lib/client/keep-awake";

interface CaptureActionsProps {
  /** "/api/quick-capture" (starts a new project) or "/api/projects/<id>/assets" (adds to that project). */
  endpoint: string;
  /** After saving, open the project it landed in (Home, /capture) instead of refreshing the page you're on. */
  goToProject?: boolean;
  /** "hero" is the violet card on Home; "card" is the compact one on a project page. */
  layout: "hero" | "card";
  initialNoteOpen?: boolean;
}

/** A recording that hasn't finished uploading — kept on screen, and (when the phone allows) in the phone's own storage too. */
interface WaitingRecording {
  id: string;
  file: File;
  endpoint: string;
  session: UploadSession | null;
  /** True when a copy is kept in the phone's storage, so it survives a closed tab or reload. */
  backedUp: boolean;
  error: string | null;
}

/** Longest to wait for the phone to store the backup copy before uploading anyway — a stuck write must not block the news. */
const BACKUP_WAIT_MS = 30_000;

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

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Hands the file to the phone's share sheet (where "Save Video" puts it in Photos), or downloads it where sharing files isn't offered. Must run straight from a tap. */
function saveCopyToPhone(source: File) {
  const file = new File([source], source.name, { type: resolveMimeType(source) });
  const download = () => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch((err) => {
      if (err instanceof Error && err.name === "AbortError") return; // closed the sheet — fine
      download();
    });
  } else {
    download();
  }
}

/**
 * The ways to add something: Camera (opens the phone's camera directly —
 * photo or video — and uploads the moment you finish), Note (type or paste
 * text), and Upload (any recording, photo, or PDF already on the phone). What
 * kind of thing a file is gets worked out from the file itself.
 *
 * Nothing recorded is ever dropped on a failure: every file is copied into the
 * phone's own storage first, stays listed here until it has fully uploaded, and
 * can be resumed, saved to the phone, or (deliberately) discarded.
 */
export function CaptureActions({ endpoint, goToProject = false, layout, initialNoteOpen = false }: CaptureActionsProps) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(initialNoteOpen);
  const [noteText, setNoteText] = useState("");
  const [waiting, setWaiting] = useState<WaitingRecording[]>([]);
  // The latest Drive session per recording, kept outside state so a resume always sees the newest one.
  const sessionsRef = useRef(new Map<string, UploadSession>());

  // Anything left over from an earlier visit (closed tab, reload, crash) shows up here, ready to resume.
  useEffect(() => {
    let cancelled = false;
    void listPending().then((saved) => {
      if (cancelled || saved.length === 0) return;
      setWaiting((current) => {
        const known = new Set(current.map((w) => w.id));
        const restored = saved
          .filter((r) => !known.has(r.id))
          .map((r) => ({ id: r.id, file: r.file, endpoint: r.endpoint, session: r.session, backedUp: true, error: null }));
        return [...current, ...restored];
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // While something is uploading, ask the browser to warn before the page is closed (desktop browsers; phones ignore it).
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function afterSuccess(projectId: string, destination: string) {
    if (goToProject || destination === "/api/quick-capture") {
      router.push(`/projects/${projectId}`);
    } else {
      router.refresh();
    }
  }

  /** Uploads one waiting recording; on failure it stays in the list with the reason. */
  async function upload(item: WaitingRecording) {
    setBusy(true);
    setActiveId(item.id);
    setError(null);
    setWaiting((all) => all.map((w) => (w.id === item.id ? { ...w, error: null } : w)));
    const letScreenSleep = keepScreenAwake();
    try {
      const { projectId } = await uploadFile(
        item.file,
        item.endpoint,
        setProgress,
        sessionsRef.current.get(item.id) ?? item.session,
        (session) => {
          sessionsRef.current.set(item.id, session);
          if (item.backedUp) void saveSession(item.id, session);
        },
      );
      // Only now, with the upload fully recorded, is it safe to let go of the phone-side copy.
      if (item.backedUp) await removePending(item.id);
      sessionsRef.current.delete(item.id);
      setWaiting((all) => all.filter((w) => w.id !== item.id));
      // Cleared only after success: resetting an input early can invalidate the picked file on some phones.
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
      afterSuccess(projectId, item.endpoint);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setWaiting((all) => all.map((w) => (w.id === item.id ? { ...w, error: message } : w)));
    } finally {
      letScreenSleep();
      setBusy(false);
      setActiveId(null);
      setProgress(null);
    }
  }

  async function startFile(file: File) {
    setBusy(true);
    setError(null);
    setProgress("Saving a copy on this phone…");
    const saved = await Promise.race([
      savePending(file, endpoint),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), BACKUP_WAIT_MS)),
    ]);
    const item: WaitingRecording = saved
      ? { id: saved.id, file, endpoint, session: null, backedUp: true, error: null }
      : { id: crypto.randomUUID(), file, endpoint, session: null, backedUp: false, error: null };
    setWaiting((all) => [...all, item]);
    await upload(item);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void startFile(file);
  }

  async function onSaveNote() {
    if (noteText.trim().length === 0) {
      setError("Type or paste a note first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { projectId } = await saveNote(noteText, endpoint);
      setNoteText("");
      setNoteOpen(false);
      afterSuccess(projectId, endpoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the note");
    } finally {
      setBusy(false);
    }
  }

  async function discard(item: WaitingRecording) {
    const sure = window.confirm(
      "Delete this recording from this phone?\n\nIt has NOT finished uploading, so it will be gone for good.",
    );
    if (!sure) return;
    if (item.backedUp) await removePending(item.id);
    sessionsRef.current.delete(item.id);
    setWaiting((all) => all.filter((w) => w.id !== item.id));
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

  const activeItem = waiting.find((w) => w.id === activeId);

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
        {activeItem?.backedUp
          ? "A copy is kept on this phone until it's safely uploaded. Keep this screen open."
          : "Keep this screen open until it finishes."}
      </p>
    </div>
  );

  const primaryButton = hero
    ? "inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-violet hover:brightness-95"
    : "btn-primary";
  const secondaryButton = hero
    ? "inline-flex min-h-11 items-center rounded-full bg-white/20 px-5 text-sm font-medium hover:bg-white/30"
    : "btn-secondary";
  const quietButton = hero
    ? "inline-flex min-h-11 items-center px-3 text-xs font-medium text-violet-100 hover:text-white"
    : "btn-ghost text-xs";

  // Recordings that haven't finished uploading. Not shown for the one currently uploading (the progress panel covers it).
  const waitingList = waiting
    .filter((w) => w.id !== activeId)
    .map((w) => (
      <div
        key={w.id}
        className={`mt-4 rounded-2xl px-4 py-3 text-sm ${hero ? "bg-black/25 text-white" : "bg-surface-2"}`}
      >
        <p className="font-semibold">
          {w.error ? "This recording hasn't finished uploading" : "A recording is waiting to upload"}
        </p>
        <p className={`mt-0.5 break-all text-xs ${hero ? "text-violet-100" : "text-muted"}`}>
          {w.file.name} · {formatSize(w.file.size)}
        </p>
        {w.error && <p className={`mt-2 ${hero ? "text-white" : "text-danger"}`}>{w.error}</p>}
        <p className={`mt-2 text-xs ${hero ? "text-violet-100" : "text-muted"}`}>
          {w.backedUp
            ? "It's safe: a copy is kept on this phone. Resume whenever you have a signal."
            : "No backup copy could be kept on this phone, so stay on this page — or save a copy to your phone now."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void upload(w)} className={primaryButton}>
            {w.error ? "Try again" : "Resume upload"}
          </button>
          <button type="button" onClick={() => saveCopyToPhone(w.file)} className={secondaryButton}>
            Save to phone
          </button>
          <button type="button" disabled={busy} onClick={() => void discard(w)} className={quietButton}>
            Discard
          </button>
        </div>
      </div>
    ));

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
          <button type="button" onClick={() => void onSaveNote()} className={primaryButton}>
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
    <p className={`mt-3 text-sm ${hero ? "rounded-2xl bg-black/25 px-3 py-2 text-white" : "text-danger"}`}>{error}</p>
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
        {waitingList}
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
      {waitingList}
      {notePanel}
      {errorLine}
    </section>
  );
}
