import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Pre-event/contextual project details (title/notes/date/venue) — all
 * optional, fillable whenever, per the Product Plan's "capture must never
 * wait on organization" principle.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: { name?: string; notes?: string | null; venue?: string | null; eventDate?: Date | null } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  }
  if (body.venue !== undefined) {
    data.venue = typeof body.venue === "string" && body.venue.trim() ? body.venue.trim() : null;
  }
  if (body.eventDate !== undefined) {
    data.eventDate = typeof body.eventDate === "string" && body.eventDate ? new Date(body.eventDate) : null;
  }

  const updated = await prisma.project.update({ where: { id }, data });
  return NextResponse.json(updated);
}
