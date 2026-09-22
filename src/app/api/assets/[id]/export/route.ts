import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAssetMarkdown } from "@/lib/export/asset-markdown";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { project: true, transcript: true, flaggedQuotes: true, socialPosts: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const markdown = buildAssetMarkdown(asset);
  const safeName = asset.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `${safeName}-${asset.type.toLowerCase()}-${asset.id.slice(0, 8)}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
