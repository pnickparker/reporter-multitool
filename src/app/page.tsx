import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateProjectForm } from "@/components/create-project-form";
import { TagBadges } from "@/components/tag-badges";
import { ProjectRowHeader } from "@/components/project-row-header";
import { CaptureActions } from "@/components/capture-actions";
import type { DotState } from "@/components/status-dot";

const WORKING_STATUSES = ["TRANSCRIBING", "GENERATING"];

function projectDotState(statuses: string[]): DotState {
  if (statuses.some((s) => WORKING_STATUSES.includes(s))) return "working";
  if (statuses.includes("ERROR")) return "error";
  if (statuses.includes("READY")) return "ready";
  return "idle";
}

/** The project with clips being processed right now, if any — recent only, so a long-stuck row doesn't show as "working" forever. */
async function getProcessingBanner(ownerId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const working = await prisma.asset.findMany({
    where: {
      status: { in: WORKING_STATUSES as ("TRANSCRIBING" | "GENERATING")[] },
      uploadedAt: { gte: since },
      project: { ownerId },
    },
    select: { project: { select: { id: true, name: true } } },
  });
  if (working.length === 0) return null;
  const first = working[0].project;
  const count = working.filter((a) => a.project.id === first.id).length;
  return { id: first.id, name: first.name, count };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const user = await prisma.user.findFirst({
    where: { driveConnection: { isNot: null } },
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-10">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Mobile News Bureau<span className="text-mint">.</span>
        </h1>
        <p className="mt-4 text-muted">Connect Google Drive to get started.</p>
        <a href="/api/auth/google/connect" className="btn-primary mt-4">
          Connect Google Drive
        </a>
      </main>
    );
  }

  const [projects, banner] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: user.id, ...(tag ? { tags: { has: tag } } : {}) },
      include: {
        _count: { select: { assets: true } },
        assets: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getProcessingBanner(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold tracking-tight">
          Mobile News Bureau<span className="text-mint">.</span>
        </h1>
        <span
          title={`Signed in as ${user.email}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-base font-bold text-violet-soft"
        >
          <span aria-hidden="true">{user.email.charAt(0).toUpperCase()}</span>
          <span className="sr-only">Signed in as {user.email}</span>
        </span>
      </header>

      <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight">
        What are you covering?
      </h2>

      <CaptureActions endpoint="/api/quick-capture" goToProject layout="hero" />

      {banner && (
        <Link
          href={`/projects/${banner.id}`}
          className="mt-4 flex items-center gap-3 rounded-2xl bg-mint-deep px-4 py-3.5 text-sm leading-5 text-emerald-50"
        >
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-mint" />
          <span>
            <span className="font-bold">{banner.name}</span> · {banner.count} working
          </span>
        </Link>
      )}

      <div className="mt-6">
        <CreateProjectForm />
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold">Projects</h2>
      </div>

      {tag && (
        <p className="mt-2 text-sm text-muted">
          Showing beat: <span className="font-semibold text-ink">{tag}</span> —{" "}
          <Link href="/" className="text-violet-soft hover:underline">
            clear filter
          </Link>
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {projects.map((project) => (
          <li key={project.id} className="rounded-3xl bg-surface px-4 pb-1 pt-1">
            <ProjectRowHeader
              projectId={project.id}
              name={project.name}
              assetCount={project._count.assets}
              state={projectDotState(project.assets.map((a) => a.status))}
            />
            {project.tags.length > 0 && (
              <div className="pb-3 pl-[22px]">
                <TagBadges tags={project.tags} />
              </div>
            )}
          </li>
        ))}
        {projects.length === 0 && tag && (
          <p className="text-sm text-muted">No projects tagged &ldquo;{tag}&rdquo;.</p>
        )}
        {projects.length === 0 && !tag && (
          <p className="text-sm text-muted">No projects yet — start a capture above, or create one.</p>
        )}
      </ul>
    </main>
  );
}
