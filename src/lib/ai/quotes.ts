import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import { AP_STYLE_INSTRUCTION } from "./style";

const QuotesSchema = z.object({
  quotes: z.array(
    z.object({
      text: z.string(),
      timestampSeconds: z.number(),
      reason: z.string(),
    }),
  ),
});

export interface FlaggedQuoteResult {
  text: string;
  timestampSeconds: number;
  reason: string;
}

interface Utterance {
  speaker?: string;
  text?: string;
  start?: number;
}

/** Renders AssemblyAI's speaker-labeled utterances as a timestamped transcript the model can cite precisely. */
function formatTranscript(segments: unknown): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const lines = segments
    .filter((s): s is Utterance => typeof s === "object" && s !== null && "text" in s)
    .map((u) => {
      const seconds = typeof u.start === "number" ? Math.round(u.start / 1000) : "?";
      return `[${seconds}s] Speaker ${u.speaker ?? "?"}: ${u.text}`;
    });
  return lines.length > 0 ? lines.join("\n") : null;
}

export async function flagQuotes(
  transcriptText: string,
  segments: unknown,
): Promise<FlaggedQuoteResult[]> {
  const transcript = formatTranscript(segments) ?? transcriptText;

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: `You are a news editor identifying quotable moments in an interview transcript for a reporter to use in social media posts and articles. ${AP_STYLE_INSTRUCTION}`,
    messages: [
      {
        role: "user",
        content: `Read this speaker-labeled, timestamped interview transcript and flag the 3-6 most quotable moments: compelling, self-contained statements worth pulling out on their own. For each, give the exact quote text (verbatim from the transcript), the timestamp in seconds where it starts, and a brief reason it's worth flagging.\n\nTranscript:\n${transcript}`,
      },
    ],
    output_config: { format: zodOutputFormat(QuotesSchema) },
  });

  return response.parsed_output?.quotes ?? [];
}
