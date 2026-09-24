"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ProjectDetailsFormProps {
  projectId: string;
  notes: string | null;
  venue: string | null;
  /** ISO date string (yyyy-mm-dd) or null, ready for an <input type="date"> */
  eventDate: string | null;
}

/** Optional pre-event/contextual fields — fillable anytime, or never. */
export function ProjectDetailsForm({ projectId, notes, venue, eventDate }: ProjectDetailsFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [venueValue, setVenueValue] = useState(venue ?? "");
  const [dateValue, setDateValue] = useState(eventDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDetails = Boolean(notes || venue || eventDate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue, venue: venueValue, eventDate: dateValue || null }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }

    setExpanded(false);
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-sm text-zinc-500 hover:underline"
      >
        {hasDetails ? "Edit details" : "Add details (venue, date, notes) — optional"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-zinc-300 p-4 text-sm dark:border-zinc-700"
    >
      <label className="flex flex-col gap-1">
        Date
        <input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Venue
        <input
          type="text"
          value={venueValue}
          onChange={(e) => setVenueValue(e.target.value)}
          placeholder="e.g. City Hall, Council Chambers"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Notes
        <textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          rows={3}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save details"}
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="text-zinc-500 hover:underline">
          Cancel
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
