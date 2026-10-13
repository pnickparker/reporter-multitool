import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { asUtterances, speakerNamesOf, speakersIn } from "@/lib/transcript-format";

const MAX_NAME_LENGTH = 60;

/**
 * Saves the names a reporter gave a recording's speakers ("Speaker A" → "Coach
 * Smith"). Body: { names: { "A": "Coach Smith", "B": "" } } — an empty name puts
 * the original label back. Only speakers that actually appear in the transcript
 * are accepted. The transcript itself is never changed; names are applied when
 * it's shown or exported.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const asset = await prisma.asset.findUnique({ where: { id }, include: { project: true, transcript: true } });
  if (!asset || asset.project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!asset.transcript) {
    return NextResponse.json({ error: "There is no transcript to name speakers in" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const incoming = body?.names;
  if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
    return NextResponse.json({ error: "names must be an object like {\"A\": \"Coach Smith\"}" }, { status: 400 });
  }

  const real = new Set(speakersIn(asUtterances(asset.transcript.segments)));
  const merged = speakerNamesOf(asset.speakerNames);
  for (const [speaker, raw] of Object.entries(incoming)) {
    if (!real.has(speaker)) {
      return NextResponse.json({ error: `There is no speaker "${speaker}" in this transcript` }, { status: 400 });
    }
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Each name must be text" }, { status: 400 });
    }
    const name = raw.trim().slice(0, MAX_NAME_LENGTH);
    if (name) merged[speaker] = name;
    else delete merged[speaker];
  }

  await prisma.asset.update({
    where: { id },
    data: { speakerNames: Object.keys(merged).length > 0 ? merged : Prisma.DbNull },
  });
  return NextResponse.json({ names: merged });
}
