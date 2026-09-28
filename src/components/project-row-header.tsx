"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** The name/asset-count line of a home page project row — click "Rename" to edit the name in place, or click the name itself to open the project. */
export function ProjectRowHeader({
  projectId,
  name,
  assetCount,
}: {
  projectId: string;
  name: string;
  assetCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name can't be empty");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to rename");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={saving}
          className="text-xs font-medium text-zinc-900 hover:underline disabled:opacity-50 dark:text-zinc-100"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(name);
            setError(null);
          }}
          className="text-xs text-zinc-500 hover:underline"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={`/projects/${projectId}`} className="flex-1 truncate hover:underline">
        {name}
      </Link>
      <span className="shrink-0 text-sm text-zinc-500">{assetCount} asset(s)</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-xs font-medium text-zinc-500 hover:underline"
      >
        Rename
      </button>
    </div>
  );
}
