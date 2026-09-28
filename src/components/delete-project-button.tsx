"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    if (!confirm(`Delete "${projectName}"? This removes it from the app but leaves its files in Drive. Can't be undone.`)) {
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
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
