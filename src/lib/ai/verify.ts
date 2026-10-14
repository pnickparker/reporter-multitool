import { asUtterances, type Utterance } from "@/lib/transcript-format";

/**
 * The misquote safeguard. A flagged quote must be words somebody actually said,
 * in the order they said them, from ONE speaker's turn — this checks every quote
 * the AI returns against the transcript, and every quoted passage in a drafted
 * post. It does not depend on which AI model is running, and it always runs.
 *
 *  - "exact"    the quote's words appear in a single speaker's turn exactly as written.
 *  - "adjusted" the AI's version skipped some words (joined sentences, dropped a
 *               filler or an interruption), so the exact transcript wording
 *               between its first and last words is used instead.
 *  - null       can't be matched to what was said: the quote is dropped, never shown.
 */
export type QuoteVerification = "exact" | "adjusted";

export interface VerifiedQuoteText {
  text: string;
  verification: QuoteVerification;
  /** Which speaker turn (index into the utterances passed in) the quote was found in. */
  turnIndex: number;
}

interface Token {
  /** The word as written, with its punctuation. */
  raw: string;
  /** Lower-case letters, digits and apostrophes only; empty for things like a lone dash. */
  norm: string;
  start: number;
  end: number;
}

function normalizeWord(word: string): string {
  // Curly and straight apostrophes are the same letter as far as "was this said" goes.
  return word.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9']/g, "");
}

/** Words are split on spaces AND on dashes/hyphens, so "well-known" and "well known", or "yeah—I" and "yeah — I", read the same. */
const WORD_PATTERN = /[^\s\u2014\u2013-]+/g;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD_PATTERN)) {
    tokens.push({ raw: m[0], norm: normalizeWord(m[0]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return tokens;
}

/** A quote that ends mid-sentence shouldn't end on a dangling comma or dash from the transcript. */
function tidyEnd(text: string): string {
  return text.replace(/[\s,;:\u2014\u2013-]+$/, "");
}

/** The words of a piece of text, normalised, skipping bare punctuation. */
export function wordsOf(text: string): string[] {
  return [...text.matchAll(WORD_PATTERN)].map((m) => normalizeWord(m[0])).filter(Boolean);
}

/** The speaking tokens of a turn (those with a real word), kept with their positions in the turn's text. */
function wordTokens(text: string): Token[] {
  return tokenize(text).filter((t) => t.norm.length > 0);
}

const ANCHOR_WORDS = 5;
/** An adjusted span may be this much longer than the AI's own version (plus a little) before it's no longer plausibly the same quote. */
const MAX_SPAN_GROWTH = 1.6;
const MAX_SPAN_SLACK = 8;

function sameRun(tokens: Token[], at: number, words: string[]): boolean {
  if (at + words.length > tokens.length) return false;
  for (let i = 0; i < words.length; i++) if (tokens[at + i].norm !== words[i]) return false;
  return true;
}

function findRun(tokens: Token[], words: string[], from = 0): number {
  for (let i = from; i + words.length <= tokens.length; i++) if (sameRun(tokens, i, words)) return i;
  return -1;
}

/** True when every word of `needle` appears in `haystack` in order (others may sit between them). */
function isSubsequence(needle: string[], haystack: string[]): boolean {
  let j = 0;
  for (const w of haystack) if (j < needle.length && w === needle[j]) j++;
  return j === needle.length;
}

/**
 * Checks one quote against the speaker turns of a transcript. Returns the text
 * to store (always real transcript wording) and how it was verified, or null if
 * it can't be matched to what was said.
 */
export function verifyQuote(quote: string, utterances: Utterance[]): VerifiedQuoteText | null {
  const qWords = wordsOf(quote);
  if (qWords.length < 3) return null;

  const turns = utterances
    .map((u, index) => ({ index, text: u.text ?? "", tokens: wordTokens(u.text ?? "") }))
    .filter((t) => t.tokens.length > 0);

  // 1. The same words, in a row, inside one speaker's turn.
  for (const turn of turns) {
    const at = findRun(turn.tokens, qWords);
    if (at >= 0) {
      const first = turn.tokens[at], last = turn.tokens[at + qWords.length - 1];
      return { text: tidyEnd(turn.text.slice(first.start, last.end)), verification: "exact", turnIndex: turn.index };
    }
  }

  // 2. Words skipped inside a turn: find where it starts and where it ends, then use the exact words between.
  const k = Math.min(ANCHOR_WORDS, qWords.length);
  const head = qWords.slice(0, k), tail = qWords.slice(qWords.length - k);
  for (const turn of turns) {
    const startAt = findRun(turn.tokens, head);
    if (startAt < 0) continue;
    const tailAt = findRun(turn.tokens, tail, startAt + 1);
    if (tailAt < 0) continue;
    const endAt = tailAt + tail.length - 1;
    const span = turn.tokens.slice(startAt, endAt + 1);
    if (span.length > qWords.length * MAX_SPAN_GROWTH + MAX_SPAN_SLACK) continue;
    if (!isSubsequence(qWords, span.map((t) => t.norm))) continue;
    return { text: tidyEnd(turn.text.slice(span[0].start, span[span.length - 1].end)), verification: "adjusted", turnIndex: turn.index };
  }

  return null;
}

/** Convenience for the pipeline: the speaker turns from stored transcript segments, or the whole text as one turn when there are none. */
export function turnsFrom(segments: unknown, fullText: string): Utterance[] {
  const utterances = asUtterances(segments);
  return utterances.length > 0 ? utterances : [{ text: fullText }];
}

/**
 * Looks for quoted passages inside a drafted post and checks each against the
 * transcript. "ok": every quoted passage was said. "check": one wasn't, so the
 * reporter should look before posting. null: the draft quotes nothing (so there
 * is nothing to check — it may still paraphrase, which only a reader can judge).
 * A passage with "…" or "..." inside is checked in pieces.
 */
export function checkPostQuotes(copy: string, utterances: Utterance[]): "ok" | "check" | null {
  const passages = [...copy.matchAll(/[“"]([^”"]{8,})[”"]/g)].map((m) => m[1]);
  let checked = 0;
  for (const passage of passages) {
    for (const piece of passage.split(/…|\.\.\./)) {
      if (wordsOf(piece).length < 3) continue;
      checked++;
      // A quoted passage in a post must be word for word; one with skipped words and no ellipsis is a misquote.
      if (verifyQuote(piece, utterances)?.verification !== "exact") return "check";
    }
  }
  return checked > 0 ? "ok" : null;
}

/**
 * When a quote starts and ends in the recording, in seconds, worked out from the
 * per-word timings of the speaker turn it was found in. Lets the player play just
 * the quote. Null when the turn has no word timings or the words can't be lined up.
 */
export function quoteTiming(quoteText: string, turn: Utterance): { start: number; end: number } | null {
  const qWords = wordsOf(quoteText);
  if (qWords.length === 0 || !Array.isArray(turn.words)) return null;

  // One entry per word the way this module splits words ("well-known" is two), each carrying its word's times.
  const timed: { norm: string; start: number; end: number }[] = [];
  for (const w of turn.words) {
    if (typeof w.start !== "number" || typeof w.end !== "number") continue;
    for (const piece of wordsOf(w.text ?? "")) timed.push({ norm: piece, start: w.start, end: w.end });
  }
  for (let i = 0; i + qWords.length <= timed.length; i++) {
    let match = true;
    for (let j = 0; j < qWords.length; j++) if (timed[i + j].norm !== qWords[j]) { match = false; break; }
    if (match) {
      const start = timed[i].start / 1000;
      // Word timings can run short on fast or mumbled speech; never end earlier than a brisk 4.5 words a second allows,
      // so playing "just the quote" doesn't cut the speaker off.
      const end = Math.max(timed[i + qWords.length - 1].end / 1000, start + qWords.length / 4.5);
      return { start, end };
    }
  }
  return null;
}

