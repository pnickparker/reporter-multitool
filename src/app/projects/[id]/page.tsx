import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UploadAssetForm } from "@/components/upload-asset-form";
import { AssetStatusPoller } from "@/components/asset-status-poller";
import { TranscriptView } from "@/components/transcript-view";
import { QuotesView } from "@/components/quotes-view";
import { SocialPostsView } from "@/components/social-posts-view";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: { uploadedAt: "desc" },
        include: { transcript: true, flaggedQuotes: true, socialPosts: true },
      },
    },
  });

  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <AssetStatusPoller statuses={project.assets.map((a) => a.status)} />
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; All projects
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.assets.length > 0 && (
          <a
            href={`/api/projects/${project.id}/export`}
            download
            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Export whole project
          </a>
        )}
      </div>

      <div className="mt-8">
        <UploadAssetForm projectId={project.id} />
      </div>

      <ul className="mt-8 flex flex-col gap-2">
        {project.assets.map((asset) => (
          <li
            key={asset.id}
            className="rounded border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{asset.type}</span>
              <div className="flex items-center gap-3">
                {asset.status === "READY" && (
                  <a
                    href={`/api/assets/${asset.id}/export`}
                    download
                    className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    Export
                  </a>
                )}
                <span className={asset.status === "ERROR" ? "text-red-600" : "text-zinc-500"}>
                  {asset.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Drive file: {asset.sourceFile || "—"}</p>
            {asset.status === "ERROR" && asset.errorMessage && (
              <p className="mt-1 text-xs text-red-600">{asset.errorMessage}</p>
            )}
            {asset.transcript && (
              <TranscriptView text={asset.transcript.text} segments={asset.transcript.segments} />
            )}
            <QuotesView quotes={asset.flaggedQuotes} />
            <SocialPostsView posts={asset.socialPosts} />
          </li>
        ))}
        {project.assets.length === 0 && (
          <p className="text-sm text-zinc-500">No assets yet — upload one above.</p>
        )}
      </ul>
    </main>
  );
}
