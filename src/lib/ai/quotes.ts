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
      engagementScore: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("How likely this quote is to resonate with a social media audience, 0-100."),
    }),
  ),
});

export interface FlaggedQuoteResult {
  text: string;
  timestampSeconds: number;
  reason: string;
  engagementScore: number;
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
        content: `Read this speaker-labeled, timestamped interview transcript and flag the quotable moments: compelling, self-contained statements worth pulling out on their own. Let the transcript's actual content decide how many — a short or thin clip may only have one or two genuinely quotable moments, and a rich interview may have six or more. Do not pad the list with weak filler just to reach a target count.\n\nFor each, give the exact quote text (verbatim from the transcript), the timestamp in seconds where it starts, a brief reason it's worth flagging, and an engagementScore (0-100) for how likely it is to resonate with a social media audience — be honest and use the full range; most transcripts will have at most one or two quotes above 80.\n\nTranscript:\n${transcript}`,
      },
    ],
    output_config: { format: zodOutputFormat(QuotesSchema) },
  });

  return response.parsed_output?.quotes ?? [];
}
