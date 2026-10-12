import { Readable } from "node:stream";
import { AssemblyAI } from "assemblyai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
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
export async function transcribeBuffer(buffer: Buffer): Promise<TranscriptionResult> {
  const client = new AssemblyAI({ apiKey: requireEnv("ASSEMBLYAI_API_KEY") });

  const transcript = await client.transcripts.transcribe({
    audio: buffer,
    speaker_labels: true,
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
export async function transcribeStream(stream: NodeJS.ReadableStream): Promise<TranscriptionResult> {
  const apiKey = requireEnv("ASSEMBLYAI_API_KEY");
  const client = new AssemblyAI({ apiKey });

  // The library's own upload helper gathers a stream into memory before sending, which defeats the point;
  // this sends it through as it arrives (chunked), so memory stays flat however large the recording is.
  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/octet-stream" },
    body: Readable.toWeb(stream as Readable) as unknown as ReadableStream,
    // @ts-expect-error — Node's fetch needs this to send a streamed body; it isn't in the DOM typings
    duplex: "half",
  });
  if (!uploadRes.ok) throw new Error(`AssemblyAI upload failed (${uploadRes.status})`);
  const { upload_url: uploadUrl } = (await uploadRes.json()) as { upload_url: string };

  const transcript = await client.transcripts.transcribe({
    audio: uploadUrl,
    speaker_labels: true,
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error ?? "AssemblyAI transcription failed");
  }

  return {
    text: transcript.text ?? "",
    segments: transcript.utterances ?? [],
  };
}

