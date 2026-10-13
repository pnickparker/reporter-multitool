import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Removes the leftover placeholder of an upload that never finished. Only an
 * asset still marked UPLOADING can go this way — anything that finished
 * (ready, transcribing, even one that errored) is the reporter's recording and
 * is never deleted by this route. An auto-named "Quick Capture" project that
 * ends up empty is removed with it, so a failed quick capture leaves nothing behind.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id }, include: { project: true } });
  if (!asset || asset.project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (asset.status !== "UPLOADING") {
    return NextResponse.json({ error: "Only an unfinished upload can be removed this way" }, { status: 409 });
  }

  await prisma.asset.delete({ where: { id } });

  const remaining = await prisma.asset.count({ where: { projectId: asset.projectId } });
  const autoNamed = asset.project.name.startsWith("Quick Capture — ");
  if (remaining === 0 && autoNamed) {
    await prisma.project.delete({ where: { id: asset.projectId } });
    return NextResponse.json({ removed: true, projectRemoved: true });
  }
  return NextResponse.json({ removed: true, projectRemoved: false });
}
