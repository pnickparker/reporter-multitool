import { SOCIAL_POST_SCORE_THRESHOLD } from "@/lib/ai/scoring";

interface Quote {
  id: string;
  text: string;
  timestamp: number;
  reason: string;
  engagementScore: number;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Flagged quotes
      </h3>
      <ul className="mt-2 flex flex-col gap-2">
        {quotes.map((q) => (
          <li key={q.id} className="rounded bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-zinc-800 dark:text-zinc-200">&ldquo;{q.text}&rdquo;</p>
              <span
                title={
                  q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD
                    ? "Social posts generated for this quote"
                    : `Below the ${SOCIAL_POST_SCORE_THRESHOLD} threshold — no posts generated`
                }
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                  q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {q.engagementScore}/100
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {formatTimestamp(q.timestamp)} &middot; {q.reason}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
