import { prisma } from "@/lib/db";
import { flagQuotes } from "./quotes";
import { generateSocialPosts } from "./social-posts";
import { errorMessage } from "@/lib/error-message";
import { SOCIAL_POST_SCORE_THRESHOLD } from "./scoring";

/**
 * Runs after transcription completes (see transcription/process.ts) — quote
 * flagging and social post generation both need the finished transcript.
 */
export async function processAiPipeline(assetId: string) {
  try {
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      include: { transcript: true },
    });
    if (!asset.transcript) throw new Error("No transcript to process");

    const flagged = await flagQuotes(asset.transcript.text, asset.transcript.segments);

    const savedQuotes = await Promise.all(
      flagged.map((q) =>
        prisma.flaggedQuote.create({
          data: {
            assetId,
            text: q.text,
            timestamp: q.timestampSeconds,
            reason: q.reason,
            engagementScore: q.engagementScore,
          },
        }),
      ),
    );

    // Every flagged quote is saved above regardless of score, so reporters can
    // still see the full list — only the strongest quotes get posts drafted.
    const postWorthyQuotes = savedQuotes.filter((q) => q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD);

    const posts = await generateSocialPosts(
      asset.transcript.text,
      postWorthyQuotes.map((q) => ({ id: q.id, text: q.text, reason: q.reason })),
    );

    await prisma.generatedSocialPost.createMany({
      data: posts.map((p) => ({
        assetId,
        quoteId: p.quoteId,
        platform: p.platform,
        copy: p.copy,
      })),
    });

    await prisma.asset.update({ where: { id: assetId }, data: { status: "READY" } });
  } catch (err) {
    console.error(`AI pipeline failed for asset ${assetId}:`, err);
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
  }
}
