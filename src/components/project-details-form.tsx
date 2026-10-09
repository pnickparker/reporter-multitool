"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ProjectDetailsFormProps {
  projectId: string;
  notes: string | null;
  venue: string | null;
  /** ISO date string (yyyy-mm-dd) or null, ready for an <input type="date"> */
  eventDate: string | null;
  tags: string[];
}

/** Optional pre-event/contextual fields, plus beat tags — fillable anytime, or never. */
export function ProjectDetailsForm({
  projectId,
  notes,
  venue,
  eventDate,
  tags,
}: ProjectDetailsFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [venueValue, setVenueValue] = useState(venue ?? "");
  const [dateValue, setDateValue] = useState(eventDate ?? "");
  const [tagsValue, setTagsValue] = useState(tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDetails = Boolean(notes || venue || eventDate || tags.length > 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: notesValue,
        venue: venueValue,
        eventDate: dateValue || null,
        tags: tagsValue
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
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
      <button onClick={() => setExpanded(true)} className="link-action -ml-2 text-left text-violet-soft">
        {hasDetails ? "Edit details" : "Add details (beat, venue, date, notes) — optional"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl bg-surface p-4 text-sm">
      <label className="flex flex-col gap-1.5 font-medium text-muted">
        Beat / tags
        <input
          type="text"
          value={tagsValue}
          onChange={(e) => setTagsValue(e.target.value)}
          placeholder="e.g. Central High Football, City Council"
          className="field"
        />
        <span className="text-xs font-normal text-muted">
          Comma-separated — lets you find every project on the same beat later.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 font-medium text-muted">
        Date
        <input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1.5 font-medium text-muted">
        Venue
        <input
          type="text"
          value={venueValue}
          onChange={(e) => setVenueValue(e.target.value)}
          placeholder="e.g. City Hall, Council Chambers"
          className="field"
        />
      </label>
      <label className="flex flex-col gap-1.5 font-medium text-muted">
        Notes
        <textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          rows={3}
          className="field"
        />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save details"}
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="btn-ghost">
          Cancel
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </form>
  );
}
