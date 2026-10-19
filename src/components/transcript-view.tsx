import { asUtterances, speakerLabel, speakerNamesOf, speakersIn, transcriptPlainText } from "@/lib/transcript-format";
import { SpeakerNames } from "@/components/speaker-names";
import { TextActions } from "@/components/text-actions";

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
  assetId,
  speakerNames,
}: {
  text: string;
  segments: unknown;
  collapsible?: boolean;
  /** When given, speakers can be named from here. */
  assetId?: string;
  /** The names saved for this recording's speakers (raw stored value). */
  speakerNames?: unknown;
}) {
  const utterances = asUtterances(segments);
  const names = speakerNamesOf(speakerNames);
  const speakers = speakersIn(utterances);

  // A recording can have sound but no recognizable speech (music, a crowd, a performance). Say so, rather than showing a blank panel.
  if (text.trim().length === 0 && utterances.length === 0) {
    return (
      <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm leading-5 text-muted">
        No speech was detected in this recording, so there is no transcript or best moments. If it should have words,
        the voices may have been too far from the microphone or drowned out by music or noise.
      </p>
    );
  }

  const body =
    utterances.length === 0 ? (
      <p className="whitespace-pre-wrap">{text}</p>
    ) : (
      <div className="flex flex-col gap-4">
        {utterances.map((u, i) => (
          <p key={i}>
            <span className="font-semibold text-violet-soft">{speakerLabel(u.speaker, names)}:</span> {u.text}
          </p>
        ))}
      </div>
    );

  const naming = assetId && speakers.length > 0 ? <SpeakerNames assetId={assetId} speakers={speakers} names={names} /> : null;
  // Above the text, so a long transcript doesn't have to be scrolled to the end to copy it.
  const copyButton = <TextActions text={transcriptPlainText(text, utterances, names)} label="transcript" />;

  if (!collapsible) {
    return (
      <div className="mt-3 leading-relaxed text-ink/90">
        {naming}
        {copyButton}
        <div className="mt-3">{body}</div>
      </div>
    );
  }

  return (
    <details className="group mt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-violet-soft [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Show full transcript</span>
        <span className="hidden group-open:inline">Hide transcript</span>
      </summary>
      <div className="mt-1 leading-relaxed text-ink/90">
        {naming}
        {copyButton}
        <div className="mt-3">{body}</div>
      </div>
    </details>
  );
}
