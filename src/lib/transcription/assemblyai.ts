import https from "node:https";
import { Readable } from "node:stream";
import { AssemblyAI } from "assemblyai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Whether to tell the speaker labeler how many people to expect. Checked on real
 * recordings (2026-10-12/13): on SHORT clips (a minute or two) the labeler often
 * merged two voices into one block or invented a third, and telling it to expect
 * two fixed that every time; on LONG recordings it has enough audio to work the
 * voices out itself — a 35-minute interview came out identical either way, and a
 * 101-minute podcast with 6-7 voices was split into 8 speakers by itself but
 * crushed into 2 by the hint. So the hint is used only for short recordings.
 * (Reporters should still check the labels, as with any transcription tool.)
 */
const SHORT_RECORDING_SECONDS = 240;
const EXPECTED_SPEAKERS_FOR_SHORT_RECORDINGS = 2;

/**
 * `speakers_expected` for a recording: an explicit choice by the reporter wins ("auto" lets the labeler
 * decide, a number tells it how many people to expect); otherwise it depends on the recording's length. A
 * recording of unknown length is treated as short (the usual case: a quick interview).
 */
export type SpeakerChoice = number | "auto";

export function speakerHintFor(durationSeconds: number | null, choice?: SpeakerChoice): { speakers_expected?: number } {
  if (choice === "auto") return {};
  if (typeof choice === "number") return { speakers_expected: choice };
  const isShort = durationSeconds === null || durationSeconds <= SHORT_RECORDING_SECONDS;
  return isShort ? { speakers_expected: EXPECTED_SPEAKERS_FOR_SHORT_RECORDINGS } : {};
}

export interface TranscriptionResult {
  text: string;
  segments: unknown;
}

/**
 * Transcribes audio/video bytes we already have in memory (from the upload
 * request) — no need to re-download from Drive. Speaker labels are on so
 * interview transcripts show who said what.
 */
export async function transcribeBuffer(buffer: Buffer, durationSeconds: number | null = null, choice?: SpeakerChoice): Promise<TranscriptionResult> {
  const client = new AssemblyAI({ apiKey: requireEnv("ASSEMBLYAI_API_KEY") });

  const transcript = await client.transcripts.transcribe({
    audio: buffer,
    speaker_labels: true,
    ...speakerHintFor(durationSeconds, choice),
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error ?? "AssemblyAI transcription failed");
  }

  return {
    text: transcript.text ?? "",
    segments: transcript.utterances ?? [],
  };
}

/**
 * Same as transcribeBuffer, but takes the recording as a stream, so a large
 * video flows from Drive straight to the transcription service without the whole
 * file ever being held in the server's memory (a 560 MB video that was
 * downloaded in full first ran out of time and was killed mid-way).
 */
export async function transcribeStream(
  stream: NodeJS.ReadableStream,
  durationSeconds: number | null = null,
  choice?: SpeakerChoice,
): Promise<TranscriptionResult> {
  const apiKey = requireEnv("ASSEMBLYAI_API_KEY");
  const client = new AssemblyAI({ apiKey });

  // Neither the library's upload helper nor fetch() with a converted stream is safe here: both gather the whole
  // file into memory first (measured: +590 MB for a 557 MB video, which would crash the server on a multi-gigabyte
  // one). Piping through Node's own request keeps memory flat however large the recording is.
  const uploadUrl = await uploadStreamToAssemblyAI(stream as Readable, apiKey);

  const transcript = await client.transcripts.transcribe({
    audio: uploadUrl,
    speaker_labels: true,
    ...speakerHintFor(durationSeconds, choice),
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error ?? "AssemblyAI transcription failed");
  }

  return {
    text: transcript.text ?? "",
    segments: transcript.utterances ?? [],
  };
}

/** Sends a stream to AssemblyAI's upload endpoint chunk by chunk (never holding the file) and returns the URL it can be transcribed from. */
function uploadStreamToAssemblyAI(stream: Readable, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://api.assemblyai.com/v2/upload",
      {
        method: "POST",
        headers: { authorization: apiKey, "content-type": "application/octet-stream", "transfer-encoding": "chunked" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`AssemblyAI upload failed (${res.statusCode ?? "no answer"})`));
            return;
          }
          try {
            resolve((JSON.parse(body) as { upload_url: string }).upload_url);
          } catch {
            reject(new Error("AssemblyAI upload returned an answer we couldn't read"));
          }
        });
      },
    );
    req.on("error", reject);
    stream.on("error", (err) => req.destroy(err));
    stream.pipe(req);
  });
}

