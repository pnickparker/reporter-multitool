import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initMediaUpload, AssetUploadError } from "@/lib/assets/create-asset";

/** Same per-project upload entry point as POST /api/projects/[id]/assets, but for large audio/video that must go straight to Drive instead of through this server. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { fileName, mimeType } = await req.json();
  if (typeof fileName !== "string" || typeof mimeType !== "string") {
    return NextResponse.json({ error: "fileName and mimeType are required" }, { status: 400 });
  }

  try {
    const { assetId, uploadUrl } = await initMediaUpload(projectId, { fileName, mimeType }, user);
    return NextResponse.json({ assetId, projectId, uploadUrl }, { status: 201 });
  } catch (err) {
    if (err instanceof AssetUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
