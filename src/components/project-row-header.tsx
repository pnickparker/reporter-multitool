"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusDot, type DotState } from "@/components/status-dot";

/** A home page project row's name and actions — click the name to open the project, "Rename" to edit it in place. `deleteSlot` is the Delete button, passed in so it sits with the other actions. */
export function ProjectRowHeader({
  projectId,
  name,
  assetCount,
  state,
  deleteSlot,
}: {
  projectId: string;
  name: string;
  assetCount: number;
  state: DotState;
  deleteSlot: ReactNode;
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
      <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2 py-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Project name"
          className="field min-w-0 flex-1"
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
    <div>
      <div className="flex items-start gap-3 pt-1">
        <span className="mt-3">
          <StatusDot state={state} />
        </span>
        <Link
          href={`/projects/${projectId}`}
          className="line-clamp-2 min-w-0 flex-1 py-2.5 text-base font-semibold leading-snug hover:underline"
        >
          {name}
        </Link>
      </div>
      <div className="flex items-center justify-between pl-[22px]">
        <span className="text-xs text-muted">
          {assetCount} {assetCount === 1 ? "asset" : "assets"}
        </span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="link-action text-violet-soft"
          >
            Rename
          </button>
          {deleteSlot}
        </div>
      </div>
    </div>
  );
}
