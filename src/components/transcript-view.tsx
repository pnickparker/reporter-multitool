import { asUtterances } from "@/lib/transcript-format";

/**
 * Shows speaker-labeled turns when diarization data is available, falling
 * back to the flat transcript text. `collapsible` tucks it behind a toggle —
 * for recordings, where the best moments below are the point; a note's text
 * IS its content, so those stay open.
 */
export function TranscriptView({
  text,
  segments,
  collapsible = false,
}: {
  text: string;
  segments: unknown;
  collapsible?: boolean;
}) {
  const utterances = asUtterances(segments);

  const body =
    utterances.length === 0 ? (
      <p className="whitespace-pre-wrap">{text}</p>
    ) : (
      <div className="flex flex-col gap-2">
        {utterances.map((u, i) => (
          <p key={i}>
            <span className="font-semibold text-violet-soft">Speaker {u.speaker ?? "?"}:</span> {u.text}
          </p>
        ))}
      </div>
    );

  if (!collapsible) {
    return <div className="mt-3 leading-relaxed text-ink/90">{body}</div>;
  }

  return (
    <details className="group mt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-violet-soft [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Show full transcript</span>
        <span className="hidden group-open:inline">Hide transcript</span>
      </summary>
      <div className="mt-1 leading-relaxed text-ink/90">{body}</div>
    </details>
  );
}
