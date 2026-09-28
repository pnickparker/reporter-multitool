"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/** The project detail page's <h1> — click "Rename" to edit the name in place. */
export function EditableProjectTitle({ projectId, name }: { projectId: string; name: string }) {
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
      <form onSubmit={handleSave} className="flex flex-1 flex-wrap items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-2xl font-semibold dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-medium text-zinc-900 hover:underline disabled:opacity-50 dark:text-zinc-100"
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
          className="text-sm text-zinc-500 hover:underline"
        >
          Cancel
        </button>
        {error && <span className="w-full text-xs text-red-600">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-baseline gap-3">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm font-medium text-zinc-500 hover:underline"
      >
        Rename
      </button>
    </div>
  );
}
