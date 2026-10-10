/**
 * A copy of every recording kept in the browser's own storage (IndexedDB)
 * from the moment it's captured until it has fully uploaded. News can't be
 * re-shot, and the in-app camera does not save to the phone's camera roll, so
 * without this the only copy lives in the open page and a closed tab, a reload,
 * or a crash loses it. Everything here fails soft: if storage is unavailable
 * (private browsing, full disk) the upload still goes ahead, just without the
 * backup — callers are told, so the reporter can be.
 */

import type { UploadSession } from "@/lib/client/upload";

const DB_NAME = "mobile-news-bureau";
const STORE = "pending-recordings";

export interface PendingRecording {
  id: string;
  file: File;
  /** Where it was headed: "/api/quick-capture" or "/api/projects/<id>/assets". */
  endpoint: string;
  /** The Drive upload already started for it, if any — lets a resume send only what's missing. */
  session: UploadSession | null;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Storage transaction aborted"));
    });
  } finally {
    db.close();
  }
}

/** Keeps a copy of the file. Resolves to the saved record, or null if the phone's storage refused it. */
export async function savePending(file: File, endpoint: string): Promise<PendingRecording | null> {
  const record: PendingRecording = { id: crypto.randomUUID(), file, endpoint, session: null, savedAt: Date.now() };
  try {
    await withStore("readwrite", (store) => store.put(record));
    return record;
  } catch {
    return null;
  }
}

/** Remembers the Drive upload a recording is part of, so a later resume can pick up where it stopped. */
export async function saveSession(id: string, session: UploadSession): Promise<void> {
  try {
    const existing = await withStore<PendingRecording | undefined>("readonly", (store) => store.get(id));
    if (existing) await withStore("readwrite", (store) => store.put({ ...existing, session }));
  } catch {
    // Best effort: the file itself is already kept; a lost session only means a resume starts the upload over.
  }
}

/** Forgets the copy — call only once the upload has fully succeeded (or the reporter explicitly discards it). */
export async function removePending(id: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // Nothing useful to do; at worst the recording shows up again as "waiting" and is cleared next time.
  }
}

/** Every recording still waiting to finish uploading, oldest first. */
export async function listPending(): Promise<PendingRecording[]> {
  try {
    const all = await withStore<PendingRecording[]>("readonly", (store) => store.getAll());
    return all.sort((a, b) => a.savedAt - b.savedAt);
  } catch {
    return [];
  }
}
