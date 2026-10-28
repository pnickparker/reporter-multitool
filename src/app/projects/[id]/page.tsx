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
import { ExportTextButton } from "@/components/export-text-button";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { EditableProjectTitle } from "@/components/editable-project-title";
import { StatusDot, type DotState } from "@/components/status-dot";
import { MediaPlayer, MediaScope } from "@/components/media-scope";
import {
  PROCESSING_TIMEOUT_MESSAGE,
  isSavedNotProcessed,
  isStuckProcessing,
  typicalProcessingSeconds,
} from "@/lib/assets/processing-limits";
import { ProcessingProgress } from "@/components/processing-progress";
import { RerunTranscript } from "@/components/rerun-transcript";
import { TranscribeNowButton } from "@/components/transcribe-now-button";
import { RemoveUnfinishedUpload } from "@/components/remove-unfinished-upload";
import { LocalTime } from "@/components/local-time";

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

/** Longest a real upload is expected to stay "Uploading" (a ~5 GB video took about 35 minutes on Wi-Fi). Past this, the row is a leftover from an upload that never finished. */
const STALE_UPLOAD_MS = 2 * 60 * 60 * 1000;

function isStaleUpload(asset: { status: string; uploadedAt: Date }): boolean {
  return asset.status === "UPLOADING" && Date.now() - asset.uploadedAt.getTime() > STALE_UPLOAD_MS;
}

/** What the "get the original file out" button says — named for the thing it hands over, so it can't be mistaken for the text export. */
function shareLabel(type: string, isPhoto: boolean): string {
  if (isPhoto) return "Share photo";
  return { AUDIO: "Share audio", VIDEO: "Share video", NOTE: "Share note", DOCUMENT: "Share file" }[type] ?? "Share file";
}

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
      {/* Leftover placeholders and cut-off processing never finish on their own, so they must not keep the page refreshing. */}
      <AssetStatusPoller
        statuses={project.assets.filter((a) => !isStaleUpload(a) && !isStuckProcessing(a)).map((a) => a.status)}
      />
      <div className="sticky top-0 z-20 -mx-5 mb-1 bg-ground/90 px-5 py-2 backdrop-blur">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink hover:brightness-110"
        >
          <span aria-hidden="true">&larr;</span> Home
        </Link>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <EditableProjectTitle projectId={project.id} name={project.name} />
        <div className="-ml-2 flex items-center">
          {project.assets.length > 0 && (
            <ExportTextButton
              href={`/api/projects/${project.id}/export`}
              label="Export whole project"
              title={`${project.name} — full project`}
            />
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
          // Saved in full but skipped for length: shown as saved, never as a failure.
          const heldRaw = isSavedNotProcessed(asset);
          // Still marked "Transcribing" long after the server could have been working on it: it was cut off, not still going.
          const stuck = isStuckProcessing(asset);
          const held = heldRaw || stuck;
          const stale = isStaleUpload(asset);
          const canTranscribe = (asset.type === "AUDIO" || asset.type === "VIDEO") && !!asset.sourceFile;
          const typicalSeconds = typicalProcessingSeconds({ fileSizeBytes: asset.fileSizeBytes, durationSeconds: asset.duration });
          const processing = (asset.status === "TRANSCRIBING" || asset.status === "GENERATING") && !stuck;
          return (
            <li key={asset.id} className="rounded-3xl bg-surface p-4 text-sm">
              <MediaScope hasMedia={playable}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StatusDot state={held ? "held" : (STATUS_DOT[asset.status] ?? "idle")} />
                    <span className="font-bold">
                      {isPhoto ? "Photo" : (TYPE_LABEL[asset.type] ?? asset.type)} ·{" "}
                      {held ? "Saved, not transcribed" : stale ? "Upload didn't finish" : (STATUS_LABEL[asset.status] ?? asset.status)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {asset.status === "READY" && (
                      <ExportTextButton
                        href={`/api/assets/${asset.id}/export`}
                        label="Export text"
                        title={`${project.name} — transcript and quotes`}
                      />
                    )}
                    {asset.sourceFile && <ShareFileButton assetId={asset.id} driveFileId={asset.sourceFile} label={shareLabel(asset.type, isPhoto)} />}
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
                <p className="text-xs text-muted">
                  Uploaded <LocalTime iso={asset.uploadedAt.toISOString()} />
                  {/* No separate error time is stored; for a failed recording the last processing start is the nearest thing. */}
                  {asset.status === "ERROR" && asset.processingStartedAt && (
                    <>
                      {" "}
                      · Last tried <LocalTime iso={asset.processingStartedAt.toISOString()} />
                    </>
                  )}
                </p>
                {isPhoto && <PhotoPreview assetId={asset.id} />}
              {playable && (asset.type === "AUDIO" || asset.type === "VIDEO") && (
                  <MediaPlayer assetId={asset.id} kind={asset.type} />
                )}
                {stale && (
                  <div className="mt-2 rounded-2xl bg-surface-2 px-3 py-3 text-xs leading-5 text-muted">
                    This upload never finished, so there is nothing to open here. If you still have the recording, upload it
                    again.
                    <RemoveUnfinishedUpload assetId={asset.id} projectRemainsWithOthers={project.assets.length > 1} />
                  </div>
                )}
                {processing && (
                  <ProcessingProgress
                    status={asset.status as "TRANSCRIBING" | "GENERATING"}
                    startedAt={(asset.processingStartedAt ?? asset.uploadedAt).toISOString()}
                    typicalSeconds={typicalSeconds}
                  />
                )}
                {stuck && (
                  <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 text-butter">
                    {PROCESSING_TIMEOUT_MESSAGE}
                  </p>
                )}
                {held && canTranscribe && <TranscribeNowButton assetId={asset.id} />}
                {!held && asset.status === "ERROR" && canTranscribe && (
                  <TranscribeNowButton assetId={asset.id} label="Try again" />
                )}
                {asset.status === "ERROR" && asset.errorMessage && (
                  <p className={`mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 ${held ? "text-butter" : "text-danger"}`}>
                    {asset.errorMessage}
                  </p>
                )}
                {asset.status === "READY" && asset.errorMessage && (
                  <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs leading-5 text-butter">{asset.errorMessage}</p>
                )}
                {asset.transcript && (
                  <TranscriptView
                    text={asset.transcript.text}
                    segments={asset.transcript.segments}
                    collapsible={asset.type === "AUDIO" || asset.type === "VIDEO"}
                    assetId={asset.type === "AUDIO" || asset.type === "VIDEO" ? asset.id : undefined}
                    speakerNames={asset.speakerNames}
                  />
                )}
                {canTranscribe && asset.status === "READY" && asset.transcript && asset.transcript.text.trim().length > 0 && (
                  <RerunTranscript
                    assetId={asset.id}
                    typicalMinutes={typicalSeconds === null ? null : Math.max(1, Math.ceil(typicalSeconds / 60))}
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
