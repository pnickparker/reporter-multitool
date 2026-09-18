import { NextRequest, NextResponse } from "next/server";
import { AssetType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { GoogleDriveStorage } from "@/lib/storage/google-drive";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assets = await prisma.asset.findMany({
    where: { projectId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (type !== "AUDIO" && type !== "VIDEO") {
    return NextResponse.json({ error: "type must be AUDIO or VIDEO" }, { status: 400 });
  }
  const assetType = type as AssetType;

  const asset = await prisma.asset.create({
    data: { projectId, type: assetType, sourceFile: "", status: "UPLOADING" },
  });

  try {
    const auth = getDriveClientForUser(user.id, user.driveConnection);
    const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await storage.uploadFile({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      data: buffer,
    });

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { sourceFile: uploaded.id },
    });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    await prisma.asset.update({ where: { id: asset.id }, data: { status: "ERROR" } });
    console.error("Asset upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
