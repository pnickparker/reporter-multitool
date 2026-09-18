interface Post {
  id: string;
  platform: string;
  copy: string;
}

export function SocialPostsView({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Social post drafts
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {posts.map((p) => (
          <li
            key={p.id}
            className="rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <p className="text-xs font-medium text-zinc-500">{p.platform}</p>
            <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{p.copy}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
