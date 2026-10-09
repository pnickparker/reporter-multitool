export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
        Mobile News Bureau<span className="text-mint">.</span>
      </h1>
      <p className="mt-2 text-sm text-muted">Enter the shared passphrase to continue.</p>

      <form method="POST" action="/api/login" className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <input
          type="password"
          name="passphrase"
          autoFocus
          placeholder="Passphrase"
          aria-label="Passphrase"
          className="field"
        />
        <button type="submit" className="btn-primary">
          Enter
        </button>
        {error && <p className="text-sm text-danger">Wrong passphrase — try again.</p>}
      </form>
    </main>
  );
}
