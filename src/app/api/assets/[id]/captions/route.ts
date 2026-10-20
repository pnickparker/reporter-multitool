import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildSrt } from "@/lib/export/srt";
import { asUtterances } from "@/lib/transcript-format";

/** The transcript as an .srt caption file (timed, no speaker names) for Premiere, CapCut, YouTube and the like. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { project: true, transcript: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const srt = asset.transcript ? buildSrt(asUtterances(asset.transcript.segments)) : null;
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
