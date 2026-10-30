import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildSrt, type QuoteRange } from "@/lib/export/srt";
import { asUtterances, speakerNamesOf } from "@/lib/transcript-format";

/**
 * The transcript as an .srt caption file (timed, named speakers prefixed, suggested quotes marked) for
 * Premiere, CapCut, YouTube and the like.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { project: true, transcript: true, flaggedQuotes: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const quotes: QuoteRange[] = asset.flaggedQuotes
    .filter((q) => typeof q.endTimestamp === "number")
    .map((q) => ({ start: q.timestamp * 1000, end: q.endTimestamp! * 1000 }));

  const srt = asset.transcript
    ? buildSrt(asUtterances(asset.transcript.segments), speakerNamesOf(asset.speakerNames), quotes)
    : null;
  if (srt === null) {
    return NextResponse.json({ error: "This recording has no timed transcript to make captions from" }, { status: 422 });
  }

  const safeName = asset.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `${safeName}-${asset.type.toLowerCase()}-${asset.id.slice(0, 8)}.srt`;

  return new NextResponse(srt, {
    headers: {
      "Content-Type": "application/x-subrip; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
