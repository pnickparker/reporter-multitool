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
