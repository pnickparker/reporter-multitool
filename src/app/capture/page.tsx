import Link from "next/link";
import { CaptureActions } from "@/components/capture-actions";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-6">
      <Link href="/" className="link-action -ml-2 text-muted">
        &larr; All projects
      </Link>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Quick Capture</h1>
      <p className="mt-2 text-sm text-muted">
        No project needed — this creates one for you. Rename it or add details afterward.
      </p>

      <CaptureActions
        endpoint="/api/quick-capture"
        goToProject
        layout="hero"
        initialNoteOpen={type === "note"}
      />
    </main>
  );
}
