import type { Utterance } from "@/lib/transcript-format";

/**
 * SubRip (.srt) captions built from the stored speaker turns, for dropping into Premiere, CapCut, YouTube
 * and the like — so one transcript serves every tool. Timing comes from the per-word timings AssemblyAI gave
 * us; the service's own copy is deleted once ours is saved, so we cut the cues ourselves.
 *
 * House rules, from what editors expect of readable captions: at most two lines of 42 characters, a new cue
 * whenever the speaker changes, a break at a sentence end or a noticeable pause, and no cue on screen for
 * more than a few seconds. No speaker names in the text — a caption is what was said, not who said it.
 */

const MAX_LINE_CHARS = 42;
const MAX_CUE_CHARS = MAX_LINE_CHARS * 2 - 4;
const MAX_CUE_MS = 6000;
/** A silence this long between words ends the cue. */
const PAUSE_BREAK_MS = 700;
/** A sentence ending ends the cue once it has this much text (so "Yes." doesn't sit alone before a long sentence). */
const SENTENCE_BREAK_MIN_CHARS = 28;
/** Cues shorter than this are held on screen a little longer, as far as the next cue allows. */
const MIN_CUE_MS = 1000;

interface Word {
  text: string;
  start: number;
  end: number;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

function wordsOf(u: Utterance): Word[] {
  const timed: Word[] = [];
  for (const w of u.words ?? []) {
    const text = w.text?.trim();
    if (text && typeof w.start === "number" && typeof w.end === "number") timed.push({ text, start: w.start, end: w.end });
  }
  if (timed.length > 0) return timed;

  // No per-word timings (an older transcript): spread the turn's words across its span, by length.
  const text = u.text?.trim();
  if (!text || typeof u.start !== "number" || typeof u.end !== "number" || u.end <= u.start) return [];
  const pieces = text.split(/\s+/);
  const total = pieces.reduce((sum, p) => sum + p.length + 1, 0);
  let used = 0;
  return pieces.map((p) => {
    const start = u.start! + ((u.end! - u.start!) * used) / total;
    used += p.length + 1;
    return { text: p, start, end: u.start! + ((u.end! - u.start!) * used) / total };
  });
}

/** Splits one cue's text over at most two lines, balancing them so neither runs long. */
function wrap(text: string): string {
  if (text.length <= MAX_LINE_CHARS) return text;
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== " ") continue;
    if (best === -1 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  }
  return best === -1 ? text : `${text.slice(0, best)}\n${text.slice(best + 1)}`;
}

const charsOf = (words: Word[]) => words.reduce((sum, w) => sum + w.text.length + 1, 0) - 1;
const fits = (words: Word[]) => charsOf(words) <= MAX_CUE_CHARS && words[words.length - 1].end - words[0].start <= MAX_CUE_MS;

/** Splits a run of words into cues that fit, cutting near the middle (no one-word leftovers) and preferring a punctuation mark or a pause. */
function splitToFit(words: Word[]): Word[][] {
  if (fits(words)) return [words];
  const total = charsOf(words);
  let best = 1;
  let bestScore = Infinity;
  let left = 0;
  for (let i = 1; i < words.length; i++) {
    left += words[i - 1].text.length + 1;
    const afterPunctuation = /[,;:.!?]["')\]]*$/.test(words[i - 1].text);
    const afterPause = words[i].start - words[i - 1].end >= 250;
    const score = Math.abs(left - total / 2) - (afterPunctuation ? 12 : 0) - (afterPause ? 8 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [...splitToFit(words.slice(0, best)), ...splitToFit(words.slice(best))];
}

function cuesFor(words: Word[]): Cue[] {
  // First the natural breaks (a long pause, the end of a sentence), then split anything still too long to fit.
  const runs: Word[][] = [];
  let current: Word[] = [];
  for (const word of words) {
    if (current.length > 0) {
      const last = current[current.length - 1];
      const paused = word.start - last.end >= PAUSE_BREAK_MS;
      const sentenceDone = /[.!?]["')\]]*$/.test(last.text) && charsOf(current) >= SENTENCE_BREAK_MIN_CHARS;
      if (paused || sentenceDone) {
        runs.push(current);
        current = [];
      }
    }
    current.push(word);
  }
  if (current.length > 0) runs.push(current);

  return runs.flatMap(splitToFit).map((w) => ({ start: w[0].start, end: w[w.length - 1].end, text: wrap(w.map((x) => x.text).join(" ")) }));
}

function timecode(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(Math.floor(total / 3_600_000))}:${pad(Math.floor(total / 60_000) % 60)}:${pad(Math.floor(total / 1000) % 60)},${pad(total % 1000, 3)}`;
}

/** The .srt text for a transcript, or null when the stored turns carry no timing to build captions from. */
export function buildSrt(utterances: Utterance[]): string | null {
  const cues = utterances.flatMap((u) => cuesFor(wordsOf(u))).sort((a, b) => a.start - b.start);
  if (cues.length === 0) return null;

  // Editors reject overlapping cues: stretch very short ones, but never past the next cue's start.
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1];
    if (cues[i].end - cues[i].start < MIN_CUE_MS) cues[i].end = cues[i].start + MIN_CUE_MS;
    if (next && cues[i].end > next.start) cues[i].end = Math.max(cues[i].start + 1, next.start);
  }

  return cues.map((c, i) => `${i + 1}\n${timecode(c.start)} --> ${timecode(c.end)}\n${c.text}\n`).join("\n");
}
