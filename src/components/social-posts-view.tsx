import { TextActions } from "@/components/text-actions";

interface Post {
  id: string;
  platform: string;
  copy: string;
}

export function SocialPostsView({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-xl font-extrabold">Social post drafts</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {posts.map((p) => (
          <li key={p.id} className="rounded-3xl bg-surface-2 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-soft">{p.platform}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">{p.copy}</p>
            <TextActions text={p.copy} label={`${p.platform} post`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
