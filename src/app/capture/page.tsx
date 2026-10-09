import Link from "next/link";
import { CaptureForm } from "@/components/capture-form";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType = type === "note" ? "NOTE" : type === "document" ? "DOCUMENT" : "MEDIA";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-6">
      <Link href="/" className="link-action -ml-2 text-muted">
        &larr; All projects
      </Link>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Quick Capture</h1>
      <p className="mt-2 text-sm text-muted">
        No project needed — this creates one for you. Rename it or add details afterward.
      </p>

      <div className="mt-6">
        <CaptureForm initialType={initialType} />
      </div>
    </main>
  );
}
