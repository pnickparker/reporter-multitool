"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadAssetForm } from "@/components/upload-asset-form";

/**
 * "+" quick capture — no project required first, per the Product Plan's
 * "capture must never wait on organization" principle. A default-named
 * project is created on the fly by /api/quick-capture; the reporter can
 * rename it or fill in details whenever, on the project page it lands on.
 */
export default function CapturePage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; All projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Quick Capture</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        No project needed — this creates one for you. Rename it or add details afterward.
      </p>

      <div className="mt-8">
        <UploadAssetForm
          endpoint="/api/quick-capture"
          onSuccess={(asset) => router.push(`/projects/${asset.projectId}`)}
        />
      </div>
    </main>
  );
}
