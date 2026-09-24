import type {
  Asset,
  AssetType,
  FlaggedQuote,
  GeneratedSocialPost,
  Transcript,
  Project,
} from "@prisma/client";
import { asUtterances } from "@/lib/transcript-format";

export type AssetForExport = Asset & {
  project: Project;
  transcript: Transcript | null;
  flaggedQuotes: FlaggedQuote[];
  socialPosts: GeneratedSocialPost[];
};

export type AssetWithContent = Asset & {
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

function transcriptSection(heading: string, transcript: Transcript | null): string[] {
  const lines = [`${heading} Transcript`, ""];
  if (!transcript) return [...lines, "_No transcript yet._", ""];

  const utterances = asUtterances(transcript.segments);
  if (utterances.length > 0) {
    for (const u of utterances) lines.push(`**Speaker ${u.speaker ?? "?"}:** ${u.text}`, "");
  } else {
    lines.push(transcript.text, "");
  }
  return lines;
}

function quotesSection(heading: string, quotes: FlaggedQuote[]): string[] {
  const lines = [`${heading} Flagged Quotes`, ""];
  if (quotes.length === 0) return [...lines, "_No quotes flagged yet._", ""];

  for (const q of quotes) {
    lines.push(
      `- "${q.text}" (${formatTimestamp(q.timestamp)}, engagement ${q.engagementScore}/100) — ${q.reason}`,
    );
  }
  return [...lines, ""];
}

function postsSection(heading: string, posts: GeneratedSocialPost[]): string[] {
  const lines = [`${heading} Social Post Drafts`, ""];
  if (posts.length === 0) return [...lines, "_No social posts generated yet._", ""];

  const byPlatform = new Map<string, GeneratedSocialPost[]>();
  for (const p of posts) {
    byPlatform.set(p.platform, [...(byPlatform.get(p.platform) ?? []), p]);
  }
  for (const [platform, platformPosts] of byPlatform) {
    lines.push(`${heading}# ${platform}`, "");
    for (const p of platformPosts) lines.push(p.copy, "");
  }
  return lines;
}

function noteSection(heading: string, transcript: Transcript | null): string[] {
  return [`${heading} Note`, "", transcript?.text ?? "_Empty note._", ""];
}

/**
 * AUDIO/VIDEO get the full pipeline output; NOTE just shows its text; DOCUMENT
 * is reference material only (photo/PDF), nothing to render but the header —
 * see the Drive link on the asset itself.
 */
function contentSections(heading: string, type: AssetType, asset: AssetWithContent): string[] {
  if (type === "NOTE") return noteSection(heading, asset.transcript);
  if (type === "DOCUMENT") {
    return [`Reference document — [open in Drive](https://drive.google.com/file/d/${asset.sourceFile}/view).`, ""];
  }
  return [
    ...transcriptSection(heading, asset.transcript),
    ...quotesSection(heading, asset.flaggedQuotes),
    ...postsSection(heading, asset.socialPosts),
  ];
}

export function buildAssetMarkdown(asset: AssetForExport): string {
  const lines = [
    `# ${asset.project.name} — ${asset.type} (${asset.uploadedAt.toISOString().slice(0, 10)})`,
    "",
    ...contentSections("##", asset.type, asset),
  ];
  return lines.join("\n");
}

export function buildProjectMarkdown(project: Project, assets: AssetWithContent[]): string {
  const lines = [`# ${project.name}`, ""];

  for (const asset of assets) {
    lines.push(`## ${asset.type} (${asset.uploadedAt.toISOString().slice(0, 10)})`, "");
    lines.push(...contentSections("###", asset.type, asset));
  }

  if (assets.length === 0) lines.push("_No assets in this project yet._", "");

  return lines.join("\n");
}
