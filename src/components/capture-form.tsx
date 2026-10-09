"use client";

import { useRouter } from "next/navigation";
import { UploadAssetForm, type UiType } from "@/components/upload-asset-form";

/**
 * "+" quick capture — no project required first, per the Product Plan's
 * "capture must never wait on organization" principle. A default-named
 * project is created on the fly by /api/quick-capture; the reporter can
 * rename it or fill in details whenever, on the project page it lands on.
 */
export function CaptureForm({ initialType }: { initialType: UiType }) {
  const router = useRouter();

  return (
    <UploadAssetForm
      endpoint="/api/quick-capture"
      initialType={initialType}
      onSuccess={(asset) => router.push(`/projects/${asset.projectId}`)}
    />
  );
}
