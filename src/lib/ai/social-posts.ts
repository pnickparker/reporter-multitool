import { z } from "zod";
import { parseStructured } from "./run";
import type { AiUsage } from "@/lib/usage/record";
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
): Promise<{ posts: GeneratedPostResult[]; usage: AiUsage | null }> {
  if (quotes.length === 0) return { posts: [], usage: null };

  const quoteList = quotes.map((q, i) => `${i}. "${q.text}" — ${q.reason}`).join("\n");

  const { parsed, usage } = await parseStructured({
    system: `You are a social media editor for a local news outlet, turning flagged interview quotes into ready-to-post drafts. ${AP_STYLE_INSTRUCTION}`,
    prompt: `Full transcript for context:\n${transcriptText}\n\nFlagged quotes:\n${quoteList}\n\nFor each flagged quote above, write one post draft per platform (${PLATFORMS.join(", ")}) — that's ${PLATFORMS.length} drafts per quote. Match each platform's typical tone and length. Reference each quote by its index number (quoteIndex) from the list above. Whenever a draft puts words in quotation marks, they must be the quote's exact words (you may use "…" to skip words); never reword text inside quotation marks.`,
    schema: PostsSchema,
  });

  const posts = parsed.posts;
  return {
    posts: posts.map((p) => ({
      quoteId: quotes[p.quoteIndex]?.id ?? null,
      platform: p.platform,
      copy: p.copy,
    })),
    usage,
  };
}
