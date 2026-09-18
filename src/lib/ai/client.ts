import Anthropic from "@anthropic-ai/sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
