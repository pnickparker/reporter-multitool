"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { listPending } from "@/lib/client/pending-store";

/**
 * Removes a project (and its assets/transcripts/quotes/posts) from the app
 * and database. Doesn't touch the underlying files in Drive — this clears
 * the list, not the archive.
 */
export function DeleteProjectButton({
  projectId,
  projectName,
  redirectTo,
}: {
  projectId: string;
  projectName: string;
  /** Where to navigate after deleting — e.g. back to "/" from a project page that no longer exists. Defaults to refreshing the current page in place. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Recordings on this phone that are still waiting to upload into this project (or already part-uploaded to it).
    const waiting = (await listPending()).filter(
      (r) => r.endpoint.startsWith(`/api/projects/${projectId}/`) || r.session?.projectId === projectId,
    );
    const waitingNote =
      waiting.length > 0
        ? `\n\n⚠️ ${waiting.length === 1 ? "A recording on this phone hasn't" : `${waiting.length} recordings on this phone haven't`} finished uploading to this project. ${waiting.length === 1 ? "It" : "They"} will be saved to a new project instead — nothing is lost.`
        : "";
    if (!confirm(`Delete "${projectName}"? This removes it from the app but leaves its files in Drive. Can't be undone.${waitingNote}`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      alert("Couldn't delete this project — try again.");
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="link-action text-danger"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
