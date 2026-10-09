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
          aria-label="Project name"
          className="field min-w-0 flex-1 font-display text-2xl font-bold"
        />
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(name);
            setError(null);
          }}
          className="btn-ghost"
        >
          Cancel
        </button>
        {error && <span className="w-full text-xs text-danger">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">{name}</h1>
      <button type="button" onClick={() => setEditing(true)} className="link-action -ml-2 text-violet-soft">
        Rename
      </button>
    </div>
  );
}
