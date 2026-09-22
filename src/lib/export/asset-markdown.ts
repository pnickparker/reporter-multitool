import type { Asset, FlaggedQuote, GeneratedSocialPost, Transcript, Project } from "@prisma/client";
import { asUtterances } from "@/lib/transcript-format";

export type AssetForExport = Asset & {
  project: Project;
  transcript: Transcript | null;
  flaggedQuotes: FlaggedQuote[];
  socialPosts: GeneratedSocialPost[];
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function buildAssetMarkdown(asset: AssetForExport): string {
  const lines: string[] = [];

  lines.push(`# ${asset.project.name} — ${asset.type} (${asset.uploadedAt.toISOString().slice(0, 10)})`);
  lines.push("");

  lines.push("## Transcript");
  lines.push("");
  if (asset.transcript) {
    const utterances = asUtterances(asset.transcript.segments);
    if (utterances.length > 0) {
      for (const u of utterances) {
        lines.push(`**Speaker ${u.speaker ?? "?"}:** ${u.text}`, "");
      }
    } else {
      lines.push(asset.transcript.text, "");
    }
  } else {
    lines.push("_No transcript yet._", "");
  }

  lines.push("## Flagged Quotes");
  lines.push("");
  if (asset.flaggedQuotes.length > 0) {
    for (const q of asset.flaggedQuotes) {
      lines.push(`- "${q.text}" (${formatTimestamp(q.timestamp)}) — ${q.reason}`);
    }
    lines.push("");
  } else {
    lines.push("_No quotes flagged yet._", "");
  }

  lines.push("## Social Post Drafts");
  lines.push("");
  if (asset.socialPosts.length > 0) {
    const byPlatform = new Map<string, GeneratedSocialPost[]>();
    for (const p of asset.socialPosts) {
      byPlatform.set(p.platform, [...(byPlatform.get(p.platform) ?? []), p]);
    }
    for (const [platform, posts] of byPlatform) {
      lines.push(`### ${platform}`, "");
      for (const p of posts) {
        lines.push(p.copy, "");
      }
    }
  } else {
    lines.push("_No social posts generated yet._", "");
  }

  return lines.join("\n");
}
