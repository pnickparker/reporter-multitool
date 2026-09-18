import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UploadAssetForm } from "@/components/upload-asset-form";
import { AssetStatusPoller } from "@/components/asset-status-poller";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { assets: { orderBy: { uploadedAt: "desc" }, include: { transcript: true } } },
  });

  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <AssetStatusPoller statuses={project.assets.map((a) => a.status)} />
      <a href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; All projects
      </a>
      <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>

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
              <span className="text-zinc-500">{asset.status}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Drive file: {asset.sourceFile || "—"}</p>
            {asset.transcript && (
              <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {asset.transcript.text}
              </p>
            )}
          </li>
        ))}
        {project.assets.length === 0 && (
          <p className="text-sm text-zinc-500">No assets yet — upload one above.</p>
        )}
      </ul>
    </main>
  );
}
