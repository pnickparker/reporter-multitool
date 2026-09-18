import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import { AP_STYLE_INSTRUCTION } from "./style";

const PLATFORMS = ["Twitter/X", "Instagram", "Facebook"] as const;

const PostsSchema = z.object({
  posts: z.array(
    z.object({
      quoteIndex: z.number().int(),
      platform: z.string(),
      copy: z.string(),
    }),
  ),
});

export interface QuoteForGeneration {
  id: string;
  text: string;
  reason: string;
}

export interface GeneratedPostResult {
  quoteId: string | null;
  platform: string;
  copy: string;
}

export async function generateSocialPosts(
  transcriptText: string,
  quotes: QuoteForGeneration[],
): Promise<GeneratedPostResult[]> {
  if (quotes.length === 0) return [];

  const quoteList = quotes.map((q, i) => `${i}. "${q.text}" — ${q.reason}`).join("\n");

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: `You are a social media editor for a local news outlet, turning flagged interview quotes into ready-to-post drafts. ${AP_STYLE_INSTRUCTION}`,
    messages: [
      {
        role: "user",
        content: `Full transcript for context:\n${transcriptText}\n\nFlagged quotes:\n${quoteList}\n\nFor each flagged quote above, write one post draft per platform (${PLATFORMS.join(", ")}) — that's ${PLATFORMS.length} drafts per quote. Match each platform's typical tone and length. Reference each quote by its index number (quoteIndex) from the list above.`,
      },
    ],
    output_config: { format: zodOutputFormat(PostsSchema) },
  });

  const posts = response.parsed_output?.posts ?? [];
  return posts.map((p) => ({
    quoteId: quotes[p.quoteIndex]?.id ?? null,
    platform: p.platform,
    copy: p.copy,
  }));
}
