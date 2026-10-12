import https from "node:https";
import { Readable } from "node:stream";
import { AssemblyAI } from "assemblyai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * How many speakers the labeler is told to expect. News recordings are mostly
 * two-person interviews, and without this hint the labeler often merged the two
 * voices into one block or invented a third speaker (checked on 11 real
 * recordings: every multi-person one improved). The cost: a recording of one
 * person talking can occasionally be cut in two. Reporters should still check
 * the labels, as with any transcription tool.
 */
const EXPECTED_SPEAKERS = 2;

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
    speakers_expected: EXPECTED_SPEAKERS,
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

  // Neither the library's upload helper nor fetch() with a converted stream is safe here: both gather the whole
  // file into memory first (measured: +590 MB for a 557 MB video, which would crash the server on a multi-gigabyte
  // one). Piping through Node's own request keeps memory flat however large the recording is.
  const uploadUrl = await uploadStreamToAssemblyAI(stream as Readable, apiKey);

  const transcript = await client.transcripts.transcribe({
    audio: uploadUrl,
    speaker_labels: true,
    speakers_expected: EXPECTED_SPEAKERS,
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

