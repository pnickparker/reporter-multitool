export interface Utterance {
  speaker?: string;
  text?: string;
  /** Milliseconds from the start of the recording. */
  start?: number;
  end?: number;
  /** Per-word timings, when the transcription service gave them. */
  words?: { text?: string; start?: number; end?: number }[];
}

/** Shared by the transcript UI and export — narrows AssemblyAI's stored JSON segments to speaker turns. */
export function asUtterances(segments: unknown): Utterance[] {
  if (!Array.isArray(segments)) return [];
  return segments.filter(
    (s): s is Utterance => typeof s === "object" && s !== null && "text" in s,
  );
}

/** Names the reporter gave speakers, as stored on the asset ({"A": "Coach Smith"}); anything malformed is ignored. */
export function speakerNamesOf(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const names: Record<string, string> = {};
  for (const [key, name] of Object.entries(value)) {
    if (typeof name === "string" && name.trim().length > 0) names[key] = name.trim();
  }
  return names;
}

/** What to call a speaker: the reporter's name for them, or the service's own "Speaker A". */
export function speakerLabel(speaker: string | undefined, names: Record<string, string>): string {
  const key = speaker ?? "?";
  return names[key] ?? `Speaker ${key}`;
}

/** The distinct speakers in a transcript, in the order they first speak. */
export function speakersIn(utterances: Utterance[]): string[] {
  const seen: string[] = [];
  for (const u of utterances) if (u.speaker && !seen.includes(u.speaker)) seen.push(u.speaker);
  return seen;
}

