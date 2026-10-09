import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CaptureActions } from "@/components/capture-actions";
import { PhotoPreview } from "@/components/photo-preview";
import { AssetStatusPoller } from "@/components/asset-status-poller";
import { TranscriptView } from "@/components/transcript-view";
import { QuotesView } from "@/components/quotes-view";
import { SocialPostsView } from "@/components/social-posts-view";
import { ProjectDetailsForm } from "@/components/project-details-form";
import { TagBadges } from "@/components/tag-badges";
import { ShareFileButton } from "@/components/share-file-button";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { EditableProjectTitle } from "@/components/editable-project-title";
import { StatusDot, type DotState } from "@/components/status-dot";
import { MediaPlayer, MediaScope } from "@/components/media-scope";

const STATUS_DOT: Record<string, DotState> = {
  READY: "ready",
  UPLOADING: "working",
  TRANSCRIBING: "working",
  GENERATING: "working",
  ERROR: "error",
};

const STATUS_LABEL: Record<string, string> = {
  READY: "Ready",
  UPLOADING: "Uploading",
  TRANSCRIBING: "Transcribing",
  GENERATING: "Finding best moments",
  ERROR: "Needs attention",
};

const TYPE_LABEL: Record<string, string> = {
  AUDIO: "Audio",
  VIDEO: "Video",
  DOCUMENT: "Document",
  NOTE: "Note",
};

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
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-6">
      <AssetStatusPoller statuses={project.assets.map((a) => a.status)} />
      <Link href="/" className="link-action -ml-2 text-muted">
        &larr; All projects
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <EditableProjectTitle projectId={project.id} name={project.name} />
        <div className="-ml-2 flex items-center">
          {project.assets.length > 0 && (
            <a
              href={`/api/projects/${project.id}/export`}
              download
              className="link-action text-violet-soft"
            >
              Export whole project
            </a>
          )}
          <DeleteProjectButton projectId={project.id} projectName={project.name} redirectTo="/" />
        </div>
      </div>

      {(project.venue || project.eventDate || project.notes || project.tags.length > 0) && (
        <div className="mt-2 flex flex-col gap-2 text-sm text-muted">
          <TagBadges tags={project.tags} />
          {(project.venue || project.eventDate) && (
            <div>
              {project.venue}
              {project.venue && project.eventDate && " · "}
              {project.eventDate?.toISOString().slice(0, 10)}
            </div>
          )}
          {project.notes && <p>{project.notes}</p>}
        </div>
      )}

      <div className="mt-2">
        <ProjectDetailsForm
          projectId={project.id}
          notes={project.notes}
          venue={project.venue}
          eventDate={project.eventDate ? project.eventDate.toISOString().slice(0, 10) : null}
          tags={project.tags}
        />
      </div>

      <div className="mt-6">
        <CaptureActions endpoint={`/api/projects/${project.id}/assets`} layout="card" />
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {project.assets.map((asset) => {
          const playable = (asset.type === "AUDIO" || asset.type === "VIDEO") && !!asset.sourceFile;
          const isPhoto = asset.type === "DOCUMENT" && !!asset.mimeType?.startsWith("image/") && !!asset.sourceFile;
          return (
            <li key={asset.id} className="rounded-3xl bg-surface p-4 text-sm">
              <MediaScope hasMedia={playable}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StatusDot state={STATUS_DOT[asset.status] ?? "idle"} />
                    <span className="font-bold">
                      {isPhoto ? "Photo" : (TYPE_LABEL[asset.type] ?? asset.type)} · {STATUS_LABEL[asset.status] ?? asset.status}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {asset.status === "READY" && (
                      <a href={`/api/assets/${asset.id}/export`} download className="link-action text-violet-soft">
                        Export
                      </a>
                    )}
                    {asset.sourceFile && <ShareFileButton assetId={asset.id} />}
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {asset.sourceFile ? (
                    <>
                      Drive file:{" "}
                      <a
                        href={`https://drive.google.com/file/d/${asset.sourceFile}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-soft hover:underline"
                      >
                        open
                      </a>
                    </>
                  ) : (
                    "Drive file: —"
                  )}
                </p>
                {isPhoto && <PhotoPreview assetId={asset.id} />}
              {playable && (asset.type === "AUDIO" || asset.type === "VIDEO") && (
                  <MediaPlayer assetId={asset.id} kind={asset.type} />
                )}
                {asset.status === "ERROR" && asset.errorMessage && (
                  <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 text-danger">
                    {asset.errorMessage}
                  </p>
                )}
                {asset.transcript && (
                  <TranscriptView
                    text={asset.transcript.text}
                    segments={asset.transcript.segments}
                    collapsible={asset.type === "AUDIO" || asset.type === "VIDEO"}
                  />
                )}
                <QuotesView quotes={asset.flaggedQuotes} />
                <SocialPostsView posts={asset.socialPosts} />
              </MediaScope>
            </li>
          );
        })}
        {project.assets.length === 0 && (
          <p className="text-sm text-muted">No assets yet — upload one above.</p>
        )}
      </ul>
    </main>
  );
}
