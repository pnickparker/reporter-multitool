export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Reporter Multi-Tool</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Enter the shared passphrase to continue.</p>

      <form method="POST" action="/api/login" className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <input
          type="password"
          name="passphrase"
          autoFocus
          placeholder="Passphrase"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Enter
        </button>
        {error && <p className="text-sm text-red-600">Wrong passphrase — try again.</p>}
      </form>
    </main>
  );
}
