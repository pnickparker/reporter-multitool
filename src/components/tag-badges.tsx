import Link from "next/link";

/** Clickable beat/tag badges — link to the home page filtered to that tag. */
export function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/?tag=${encodeURIComponent(tag)}`}
          className="rounded-full bg-surface-2 px-3 py-1 text-xs text-violet-100 hover:bg-line"
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
