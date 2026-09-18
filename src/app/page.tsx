import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function Home() {
  const user = await prisma.user.findFirst({ where: { driveConnection: { isNot: null } } });

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
    where: { ownerId: user.id },
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

      <ul className="mt-8 flex flex-col gap-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span>{project.name}</span>
              <span className="text-sm text-zinc-500">{project._count.assets} asset(s)</span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-zinc-500">No projects yet — create one above.</p>
        )}
      </ul>
    </main>
  );
}
