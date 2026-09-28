import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initMediaUpload, AssetUploadError, defaultProjectName } from "@/lib/assets/create-asset";

/** Same "no project needed" quick-capture entry point as /api/quick-capture, but for large audio/video that must go straight to Drive instead of through this server. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const { fileName, mimeType } = await req.json();

  if (typeof fileName !== "string" || typeof mimeType !== "string") {
    return NextResponse.json({ error: "fileName and mimeType are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { name: defaultProjectName(), tags: [], ownerId: user.id },
  });

  try {
    const { assetId, uploadUrl } = await initMediaUpload(project.id, { fileName, mimeType }, user);
    return NextResponse.json({ assetId, projectId: project.id, uploadUrl }, { status: 201 });
  } catch (err) {
    if (err instanceof AssetUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
