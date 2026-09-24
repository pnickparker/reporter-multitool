import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProjectMarkdown } from "@/lib/export/asset-markdown";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: { uploadedAt: "desc" },
        include: { transcript: true, flaggedQuotes: true, socialPosts: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const markdown = buildProjectMarkdown(project, project.assets);
  const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-full-project.md"`,
    },
  });
}
