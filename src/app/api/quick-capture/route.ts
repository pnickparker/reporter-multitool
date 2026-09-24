import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAssetFromFormData, AssetUploadError } from "@/lib/assets/create-asset";

function defaultProjectName(): string {
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Quick Capture — ${date}`;
}

/**
 * Capture with no project required first (per the Product Plan's "capture
 * must never wait on organization" principle) — creates a default-named
 * project on the fly, then uploads into it exactly like the normal flow.
 * The reporter can rename/fill in details on the project page whenever.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const formData = await req.formData();

  const project = await prisma.project.create({
    data: { name: defaultProjectName(), tags: [], ownerId: user.id },
  });

  try {
    const asset = await createAssetFromFormData(project.id, formData, user);
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    if (err instanceof AssetUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
