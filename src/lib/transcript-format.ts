export interface Utterance {
  speaker?: string;
  text?: string;
}

/** Shared by the transcript UI and export — narrows AssemblyAI's stored JSON segments to speaker turns. */
export function asUtterances(segments: unknown): Utterance[] {
  if (!Array.isArray(segments)) return [];
  return segments.filter(
    (s): s is Utterance => typeof s === "object" && s !== null && "text" in s,
  );
}
