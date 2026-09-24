import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type { Asset, GoogleDriveConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDriveClientForUser } from "@/lib/google/drive-client";
import { GoogleDriveStorage } from "@/lib/storage/google-drive";
import { processTranscription } from "@/lib/transcription/process";
import { errorMessage } from "@/lib/error-message";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assets = await prisma.asset.findMany({
    where: { projectId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(assets);
}

type CurrentUser = { id: string; driveConnection: GoogleDriveConnection };

/** AUDIO/VIDEO: full pipeline — upload to Drive, then transcribe + flag quotes + draft posts. */
async function handleMediaUpload(asset: Asset, file: File, user: CurrentUser) {
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
    data: { sourceFile: uploaded.id, status: "TRANSCRIBING" },
  });

  after(() => processTranscription(asset.id, buffer));

  return updated;
}

/** DOCUMENT: reference material only — stored in Drive, no transcription or AI processing. */
async function handleDocumentUpload(asset: Asset, file: File, user: CurrentUser) {
  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await storage.uploadFile({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    data: buffer,
  });

  return prisma.asset.update({
    where: { id: asset.id },
    data: { sourceFile: uploaded.id, status: "READY" },
  });
}

/** NOTE: reference material only — the typed/dictated text is saved to Drive as a .txt file (so it lives alongside everything else) and shown via the existing Transcript display, but never quote-flagged. */
async function handleNoteUpload(asset: Asset, text: string, user: CurrentUser) {
  const auth = getDriveClientForUser(user.id, user.driveConnection);
  const storage = new GoogleDriveStorage(auth, user.driveConnection.driveFolderId);
  const uploaded = await storage.uploadFile({
    fileName: `note-${asset.id}.txt`,
    mimeType: "text/plain",
    data: Buffer.from(text, "utf-8"),
  });

  await prisma.transcript.create({ data: { assetId: asset.id, text, segments: [] } });

  return prisma.asset.update({
    where: { id: asset.id },
    data: { sourceFile: uploaded.id, status: "READY" },
  });
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
  const text = formData.get("text");
  const type = formData.get("type");

  if (type !== "AUDIO" && type !== "VIDEO" && type !== "DOCUMENT" && type !== "NOTE") {
    return NextResponse.json(
      { error: "type must be AUDIO, VIDEO, DOCUMENT, or NOTE" },
      { status: 400 },
    );
  }
  if (type === "NOTE") {
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing note text" }, { status: 400 });
    }
  } else if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: { projectId, type, sourceFile: "", status: "UPLOADING" },
  });

  try {
    const updated =
      type === "AUDIO" || type === "VIDEO"
        ? await handleMediaUpload(asset, file as File, user)
        : type === "DOCUMENT"
          ? await handleDocumentUpload(asset, file as File, user)
          : await handleNoteUpload(asset, text as string, user);

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "ERROR", errorMessage: errorMessage(err) },
    });
    console.error("Asset upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
