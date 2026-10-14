/**
 * List prices used to estimate what each step costs. These are the vendors' published
 * prices as of October 2026 and they change — update them here, in one place, and
 * re-check before quoting anyone a price. The numbers are estimates for pricing work,
 * not an invoice; the vendors' bills are the truth.
 */

/** Claude: [input, output] US dollars per million tokens. */
export const CLAUDE_PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

/** Transcription (AssemblyAI): dollars per audio hour, speaker labels included (about $0.15/hr base + $0.02/hr). Higher-tier speech models cost more (up to ~$0.23/hr). */
export const TRANSCRIPTION_DOLLARS_PER_HOUR = 0.17;

export function claudeCost(model: string, inputTokens: number, outputTokens: number): number {
  const [inPrice, outPrice] = CLAUDE_PRICES[model] ?? CLAUDE_PRICES["claude-opus-5"];
  return (inputTokens * inPrice + outputTokens * outPrice) / 1_000_000;
}

export function transcriptionCost(audioSeconds: number): number {
  return (audioSeconds / 3600) * TRANSCRIPTION_DOLLARS_PER_HOUR;
}
