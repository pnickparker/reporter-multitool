import { asUtterances } from "@/lib/transcript-format";

/** Shows speaker-labeled turns when diarization data is available, falling back to the flat transcript text. */
export function TranscriptView({ text, segments }: { text: string; segments: unknown }) {
  const utterances = asUtterances(segments);

  if (utterances.length === 0) {
    return <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{text}</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
      {utterances.map((u, i) => (
        <p key={i}>
          <span className="font-medium">Speaker {u.speaker ?? "?"}:</span> {u.text}
        </p>
      ))}
    </div>
  );
}
