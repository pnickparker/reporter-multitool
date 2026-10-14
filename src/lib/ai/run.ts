import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import type { AiUsage } from "@/lib/usage/record";

/**
 * The model the AI steps run on. Chosen on 2026-10-14 from a comparison on 30 real
 * transcripts (accuracy first, then speed, then cost): Claude Opus 5.5 at medium
 * effort never skipped words inside a quote (the previous setup did in ~8%), was
 * faster, and cost about 30% less. See BUSINESS_NOTES.md, "Model comparison".
 */
export const AI_MODEL = "claude-opus-5-5";
const AI_EFFORT = "medium" as const;

/** Used only if the main model declines a request (safety classifiers can, rarely) — the previous setup. */
const FALLBACK_MODEL = "claude-opus-5";

/**
 * Asks the model for structured output and returns the parsed result along with what
 * the call used (for the cost log). If the main model declines the request, the same
 * request goes to the fallback model once; if that declines too, this throws, so the
 * failure is visible and the recording can be retried — never a silent "no quotes found".
 * Usage adds up across attempts (a declined attempt is still billed).
 */
export async function parseStructured<S extends z.ZodType>(args: {
  system: string;
  prompt: string;
  schema: S;
}): Promise<{ parsed: z.infer<S>; usage: AiUsage }> {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const model of [AI_MODEL, FALLBACK_MODEL]) {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: 16000,
      system: args.system,
      messages: [{ role: "user", content: args.prompt }],
      output_config: { ...(model === AI_MODEL ? { effort: AI_EFFORT } : {}), format: zodOutputFormat(args.schema) },
    });
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    if (response.stop_reason === "refusal") {
      console.warn(`${model} declined an AI step; ${model === AI_MODEL ? "trying the fallback model" : "no model would take it"}`);
      continue;
    }
    if (response.parsed_output === null || response.parsed_output === undefined) {
      throw new Error("The AI's answer couldn't be read");
    }
    return { parsed: response.parsed_output as z.infer<S>, usage: { model, inputTokens, outputTokens } };
  }
  throw new Error("The AI declined to analyze this transcript");
}
