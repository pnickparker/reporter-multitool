import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateProjectForm } from "@/components/create-project-form";
import { TagBadges } from "@/components/tag-badges";

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
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Reporter Multi-Tool</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Connect Google Drive to get started.
        </p>
        <a
          href="/api/auth/google/connect"
          className="mt-4 inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Connect Google Drive
        </a>
      </main>
    );
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, ...(tag ? { tags: { has: tag } } : {}) },
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Reporter Multi-Tool</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Signed in as {user.email}</p>

      <div className="mt-8">
        <CreateProjectForm />
      </div>

      {tag && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Showing beat: <span className="font-medium">{tag}</span> —{" "}
          <Link href="/" className="hover:underline">
            clear filter
          </Link>
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="rounded border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <Link href={`/projects/${project.id}`} className="flex items-center justify-between">
              <span>{project.name}</span>
              <span className="text-sm text-zinc-500">{project._count.assets} asset(s)</span>
            </Link>
            {project.tags.length > 0 && (
              <div className="mt-2">
                <TagBadges tags={project.tags} />
              </div>
            )}
          </li>
        ))}
        {projects.length === 0 && tag && (
          <p className="text-sm text-zinc-500">No projects tagged &ldquo;{tag}&rdquo;.</p>
        )}
        {projects.length === 0 && !tag && (
          <p className="text-sm text-zinc-500">No projects yet — create one above.</p>
        )}
      </ul>
    </main>
  );
}
