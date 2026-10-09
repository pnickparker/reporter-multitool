import { BUTTER_SCORE_THRESHOLD, SOCIAL_POST_SCORE_THRESHOLD } from "@/lib/ai/scoring";
import { TextActions } from "@/components/text-actions";
import { SeekChip } from "@/components/media-scope";

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

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** The engagement score as a ring — mint at or above the post-draft threshold, violet below it. */
function ScoreRing({ score, strong }: { score: number; strong: boolean }) {
  const filled = (Math.max(0, Math.min(100, score)) / 100) * RING_CIRCUMFERENCE;
  return (
    <div
      className="relative h-[52px] w-[52px] shrink-0"
      title={
        strong
          ? "Social posts generated for this quote"
          : `Below the ${SOCIAL_POST_SCORE_THRESHOLD} threshold — no posts generated`
      }
    >
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-line" />
        <circle
          cx="26"
          cy="26"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
          transform="rotate(-90 26 26)"
          className={strong ? "stroke-mint" : "stroke-violet-soft"}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold">
        {score}
        <span className="sr-only"> out of 100</span>
      </span>
    </div>
  );
}

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return null;

  const ranked = [...quotes].sort((a, b) => b.engagementScore - a.engagementScore);

  return (
    <div className="mt-5">
      <h3 className="font-display text-xl font-extrabold">Best moments</h3>
      <p className="mt-1 text-[13px] leading-[19px] text-muted">
        Ranked by predicted engagement. Green is {SOCIAL_POST_SCORE_THRESHOLD} or higher and comes with post drafts.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {ranked.map((q) => {
          const strong = q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD;
          return (
            <li key={q.id} className="rounded-3xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[17px] font-medium leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                <ScoreRing score={q.engagementScore} strong={strong} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <SeekChip seconds={q.timestamp} label={formatTimestamp(q.timestamp)} />
                {strong && <span className="text-xs font-bold text-mint">Post drafts generated</span>}
                {q.engagementScore >= BUTTER_SCORE_THRESHOLD && (
                  <span
                    title={`Scored ${BUTTER_SCORE_THRESHOLD} or higher — one of the strongest quotes`}
                    className="rounded-full bg-butter px-2.5 py-1 text-xs font-bold text-butter-ink"
                  >
                    Writes like butter
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-[19px] text-muted">{q.reason}</p>
              <TextActions text={q.text} label="quote" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
