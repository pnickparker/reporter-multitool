import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initUpload, assetTypeForMime, AssetUploadError, defaultProjectName } from "@/lib/assets/create-asset";

/** The "no project needed" quick-capture entry point for files — recordings, photos, PDFs — that go straight to Drive instead of through this server (which caps request bodies at a few MB). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const { fileName, mimeType } = await req.json();

  if (typeof fileName !== "string" || typeof mimeType !== "string") {
    return NextResponse.json({ error: "fileName and mimeType are required" }, { status: 400 });
  }

  // Check before creating the project, so an unsupported file doesn't leave an empty one behind.
  if (!assetTypeForMime(mimeType)) {
    return NextResponse.json({ error: "That file type isn't supported yet" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { name: defaultProjectName(), tags: [], ownerId: user.id },
  });

  try {
    const { assetId, uploadUrl } = await initUpload(project.id, { fileName, mimeType }, user);
    return NextResponse.json({ assetId, projectId: project.id, uploadUrl }, { status: 201 });
  } catch (err) {
    if (err instanceof AssetUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
