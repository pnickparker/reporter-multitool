/**
 * Compares Claude models on the app's two AI steps (finding quotes, writing posts), using real
 * transcripts from the database. Nothing is written to the database and no transcript text is
 * committed: results go to the folder named by OUT_DIR.
 *
 *   OUT_DIR=/some/folder npx tsx scripts/compare-models.mts run        # call the models (costs real money; capped)
 *   OUT_DIR=/some/folder npx tsx scripts/compare-models.mts analyze    # numbers + a blind review file
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../src/lib/ai/client";
import { AP_STYLE_INSTRUCTION } from "../src/lib/ai/style";
import { SOCIAL_POST_SCORE_THRESHOLD } from "../src/lib/ai/scoring";
import { prisma } from "../src/lib/db";

const OUT_DIR = process.env.OUT_DIR;
if (!OUT_DIR) throw new Error("Set OUT_DIR to a folder outside the repository");
fs.mkdirSync(OUT_DIR, { recursive: true });
const RESULTS = path.join(OUT_DIR, "results.json");
const COST_CAP_DOLLARS = Number(process.env.COST_CAP ?? 8);
const MAX_TRANSCRIPTS = Number(process.env.MAX_TRANSCRIPTS ?? 30);

// [input $/M, output $/M] — published prices, October 2026
const VARIANTS: { id: string; model: string; effort?: string; price: [number, number] }[] = [
  { id: "A_opus5_current", model: "claude-opus-5", price: [5, 25] }, // exactly what the app does today
  { id: "A2_opus5_again", model: "claude-opus-5", price: [5, 25] }, // the same again: how much does it disagree with itself?
  { id: "B_opus55_medium", model: "claude-opus-5-5", effort: "medium", price: [4, 20] },
  { id: "C_sonnet55_medium", model: "claude-sonnet-5-5", effort: "medium", price: [2, 10] },
  { id: "D_haiku55_medium", model: "claude-haiku-5-5", effort: "medium", price: [0.1, 0.5] },
];

const QuotesSchema = z.object({ quotes: z.array(z.object({ text: z.string(), timestampSeconds: z.number(), reason: z.string(), engagementScore: z.number().int().min(0).max(100) })) });
const PostsSchema = z.object({ posts: z.array(z.object({ quoteIndex: z.number().int(), platform: z.string(), copy: z.string() })) });

const transcriptOf = (segments: any[]) => segments.map((u) => `[${Math.round((u.start ?? 0) / 1000)}s] Speaker ${u.speaker ?? "?"}: ${u.text}`).join("\n");
const outputConfig = (v: (typeof VARIANTS)[number], schema: z.ZodType) => ({ ...(v.effort ? { effort: v.effort } : {}), format: zodOutputFormat(schema as any) }) as any;

async function quotesCall(v: (typeof VARIANTS)[number], segments: any[]) {
  const t0 = Date.now();
  const r = await anthropic.messages.parse({
    model: v.model, max_tokens: 16000,
    system: `You are a news editor identifying quotable moments in an interview transcript for a reporter to use in social media posts and articles. ${AP_STYLE_INSTRUCTION}`,
    messages: [{ role: "user", content: `Read this speaker-labeled, timestamped interview transcript and flag the quotable moments: compelling, self-contained statements worth pulling out on their own. Let the transcript's actual content decide how many — a short or thin clip may only have one or two genuinely quotable moments, and a rich interview may have six or more. Do not pad the list with weak filler just to reach a target count.\n\nFor each, give the exact quote text (verbatim from the transcript), the timestamp in seconds where it starts, a brief reason it's worth flagging, and an engagementScore (0-100) for how likely it is to resonate with a social media audience — be honest and use the full range; most transcripts will have at most one or two quotes above 80.\n\nTranscript:\n${transcriptOf(segments)}` }],
    output_config: outputConfig(v, QuotesSchema),
  } as any);
  const u = (r as any).usage;
  return { quotes: ((r as any).parsed_output?.quotes ?? []) as any[], inTok: u.input_tokens, outTok: u.output_tokens, seconds: (Date.now() - t0) / 1000 };
}

async function postsCall(v: (typeof VARIANTS)[number], text: string, quotes: { text: string; reason: string }[]) {
  const list = quotes.map((q, i) => `${i}. "${q.text}" — ${q.reason}`).join("\n");
  const r = await anthropic.messages.parse({
    model: v.model, max_tokens: 16000,
    system: `You are a social media editor for a local news outlet, turning flagged interview quotes into ready-to-post drafts. ${AP_STYLE_INSTRUCTION}`,
    messages: [{ role: "user", content: `Full transcript for context:\n${text}\n\nFlagged quotes:\n${list}\n\nFor each flagged quote above, write one post draft per platform (Twitter/X, Instagram, Facebook) — that's 3 drafts per quote. Match each platform's typical tone and length. Reference each quote by its index number (quoteIndex) from the list above.` }],
    output_config: outputConfig(v, PostsSchema),
  } as any);
  const u = (r as any).usage;
  return { posts: ((r as any).parsed_output?.posts ?? []) as any[], inTok: u.input_tokens, outTok: u.output_tokens };
}

type Results = { transcripts: { key: string; words: number; turns: number; segments: any[]; text: string }[]; quotes: Record<string, any>; posts: Record<string, any>; spent: number };
const load = (): Results => (fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, "utf8")) : { transcripts: [], quotes: {}, posts: {}, spent: 0 });
const save = (r: Results) => fs.writeFileSync(RESULTS, JSON.stringify(r));

async function run() {
  const res = load();
  if (res.transcripts.length === 0) {
    const all = await prisma.transcript.findMany({ where: { asset: { type: { in: ["AUDIO", "VIDEO"] } } }, select: { assetId: true, text: true, segments: true } });
    const eligible = all.map((t) => ({ key: "T" + t.assetId.slice(-6), words: t.text.split(/\s+/).filter(Boolean).length, turns: (t.segments as any[]).length, segments: t.segments as any[], text: t.text }))
      .filter((t) => Array.isArray(t.segments) && t.turns >= 2 && t.words >= 150).sort((a, b) => b.words - a.words);
    // spread across lengths: take every k-th so short and long are both represented
    const step = Math.max(1, Math.floor(eligible.length / MAX_TRANSCRIPTS));
    res.transcripts = eligible.filter((_, i) => i % step === 0).slice(0, MAX_TRANSCRIPTS);
    save(res);
  }
  console.log(`${res.transcripts.length} transcripts, ${VARIANTS.length} variants, cost cap $${COST_CAP_DOLLARS}, spent so far $${res.spent.toFixed(2)}`);

  const jobs: { t: (typeof res.transcripts)[number]; v: (typeof VARIANTS)[number] }[] = [];
  for (const t of res.transcripts) for (const v of VARIANTS) if (!res.quotes[`${t.key}|${v.id}`]) jobs.push({ t, v });
  let next = 0, done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      if (res.spent >= COST_CAP_DOLLARS) { console.log("cost cap reached — stopping"); return; }
      const { t, v } = jobs[next++];
      try {
        const q = await quotesCall(v, t.segments);
        res.spent += (q.inTok * v.price[0] + q.outTok * v.price[1]) / 1e6;
        res.quotes[`${t.key}|${v.id}`] = q;
      } catch (e: any) { res.quotes[`${t.key}|${v.id}`] = { error: String(e.message).slice(0, 200), quotes: [], inTok: 0, outTok: 0, seconds: 0 }; }
      done++; if (done % 5 === 0) { save(res); console.log(`  ${done}/${jobs.length} done, spent $${res.spent.toFixed(2)}`); }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  save(res);

  // Post drafts: the SAME strong quotes (from the current setup) fed to every model, on three transcripts
  const withStrong = res.transcripts.filter((t) => (res.quotes[`${t.key}|A_opus5_current`]?.quotes ?? []).filter((q: any) => q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD).length >= 2).slice(0, 3);
  for (const t of withStrong) for (const v of VARIANTS.filter((x) => x.id !== "A2_opus5_again")) {
    const k = `${t.key}|${v.id}`; if (res.posts[k] || res.spent >= COST_CAP_DOLLARS) continue;
    const strong = res.quotes[`${t.key}|A_opus5_current`].quotes.filter((q: any) => q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD).slice(0, 4);
    try { const p = await postsCall(v, t.text, strong); res.spent += (p.inTok * v.price[0] + p.outTok * v.price[1]) / 1e6; res.posts[k] = { ...p, forQuotes: strong.map((q: any) => q.text) }; } catch (e: any) { res.posts[k] = { error: String(e.message).slice(0, 200), posts: [] }; }
    save(res);
  }
  console.log(`finished. total spent $${res.spent.toFixed(2)}`);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2));
const similar = (a: string, b: string) => { const A = tokens(a), B = tokens(b); const inter = [...A].filter((x) => B.has(x)).length; return A.size && B.size ? inter / Math.min(A.size, B.size) >= 0.6 : false; };

/** How faithful a quote is to the transcript: exactly as spoken; the same words with a few skipped (an omission); or containing words that were never said. */
function classify(quote: string, transcriptText: string): "exact" | "omission" | "reordered" | "invented" {
  const full = norm(transcriptText); const nq = norm(quote);
  if (full.includes(nq)) return "exact";
  const fw = full.split(" "); const fullWords = new Set(fw); const words = nq.split(" ");
  if (words.some((w) => !fullWords.has(w))) return "invented";
  const start = fw.findIndex((w) => w === words[0]);
  if (start < 0) return "reordered";
  let j = start;
  for (const w of words) { const k = fw.indexOf(w, j); if (k < 0 || k - j > 8) return "reordered"; j = k + 1; }
  return "omission";
}

function analyze() {
  const res = load();
  const ids = VARIANTS.map((v) => v.id);
  const rows: Record<string, { n: number; verbatim: number; omission: number; reordered: number; invented: number; tsOk: number; tsChecked: number; strong: number; butter: number; cost: number; secs: number; errors: number; transcripts: number }> = {};
  for (const id of ids) rows[id] = { n: 0, verbatim: 0, omission: 0, reordered: 0, invented: 0, tsOk: 0, tsChecked: 0, strong: 0, butter: 0, cost: 0, secs: 0, errors: 0, transcripts: 0 };
  const price = Object.fromEntries(VARIANTS.map((v) => [v.id, v.price]));
  for (const t of res.transcripts) {
    const full = norm(t.text);
    for (const id of ids) {
      const r = res.quotes[`${t.key}|${id}`]; if (!r) continue;
      const row = rows[id]; if (r.error) { row.errors++; continue; }
      row.transcripts++; row.cost += (r.inTok * price[id][0] + r.outTok * price[id][1]) / 1e6; row.secs += r.seconds;
      for (const q of r.quotes) {
        row.n++; const kind = classify(q.text, t.text); if (kind === "exact") row.verbatim++; else row[kind]++;
        if (q.engagementScore >= SOCIAL_POST_SCORE_THRESHOLD) row.strong++;
        if (q.engagementScore >= 82) row.butter++;
        const probe = norm(q.text).split(" ").slice(0, 8).join(" ");
        const u = t.segments.find((s: any) => norm(s.text ?? "").includes(probe));
        if (u) { row.tsChecked++; if (q.timestampSeconds >= u.start / 1000 - 5 && q.timestampSeconds <= (u.end ?? u.start) / 1000 + 5) row.tsOk++; }
      }
    }
  }
  // agreement with the current setup (A) and with itself (A vs A2)
  const agree = (x: string, y: string) => { let found = 0, total = 0, mine = 0, mineOk = 0;
    for (const t of res.transcripts) { const a = res.quotes[`${t.key}|${x}`], b = res.quotes[`${t.key}|${y}`]; if (!a || !b || a.error || b.error) continue;
      for (const q of a.quotes) { total++; if (b.quotes.some((o: any) => similar(q.text, o.text))) found++; }
      for (const q of b.quotes) { mine++; if (a.quotes.some((o: any) => similar(q.text, o.text))) mineOk++; } }
    return { recall: total ? found / total : 0, precision: mine ? mineOk / mine : 0 }; };
  const lines: string[] = [];
  lines.push(`# Model comparison — ${res.transcripts.length} real transcripts (${res.transcripts.reduce((s, t) => s + t.words, 0)} words), spent $${res.spent.toFixed(2)}\n`);
  lines.push("| Variant | Quotes found | Exact as spoken | Same words, some skipped | Words never said | Timestamp lands in the right turn | Strong (70+) | Cost / transcript | Seconds / transcript | Errors |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const id of ids) { const r = rows[id]; const nT = Math.max(1, r.transcripts);
    lines.push(`| ${id} | ${r.n} | ${r.n ? ((100 * r.verbatim) / r.n).toFixed(0) : "-"}% | ${r.n ? ((100 * (r.omission + r.reordered)) / r.n).toFixed(0) : "-"}% | ${r.n ? ((100 * r.invented) / r.n).toFixed(1) : "-"}% | ${r.tsChecked ? ((100 * r.tsOk) / r.tsChecked).toFixed(0) : "-"}% | ${r.strong} | $${(r.cost / nT).toFixed(4)} | ${(r.secs / nT).toFixed(0)} | ${r.errors} |`); }
  lines.push("\n**Agreement on which quotes to pick** (share of one variant's quotes that the other also picked — the first row is the noise floor: the current setup against itself):\n");
  lines.push("| Comparison | Of A's quotes, also found | Of the other's quotes, also in A |"); lines.push("|---|---|---|");
  for (const id of ids.filter((i) => i !== "A_opus5_current")) { const a = agree("A_opus5_current", id); lines.push(`| A vs ${id} | ${(100 * a.recall).toFixed(0)}% | ${(100 * a.precision).toFixed(0)}% |`); }
  fs.writeFileSync(path.join(OUT_DIR!, "summary.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));

  // Blind side-by-side file for a human to judge: variants shuffled and renamed per transcript
  const out: string[] = ["# Blind review — which quotes would YOU use?\n", "For each recording, the quote lists are from different AI setups, shuffled and labelled 1–5. Mark the ones you'd actually use, and note any that are wrong or weak.\n"];
  const shuffle = <T,>(a: T[], seed: number) => { const r = [...a]; let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const key: string[] = ["# KEY (don't open until you've finished the review)\n"];
  res.transcripts.slice(0, 8).forEach((t, ti) => {
    const order = shuffle(ids.filter((i) => i !== "A2_opus5_again"), ti + 7);
    out.push(`\n## Recording ${ti + 1} (${t.words} words)\n`); key.push(`Recording ${ti + 1}: ${order.map((id, i) => `${i + 1}=${id}`).join(", ")}`);
    order.forEach((id, i) => { const r = res.quotes[`${t.key}|${id}`]; out.push(`**Setup ${i + 1}**`); for (const q of r?.quotes ?? []) out.push(`- [score ${q.engagementScore}] “${q.text}” — ${q.reason}`); if (!(r?.quotes ?? []).length) out.push("- (no quotes)"); out.push(""); });
  });
  fs.writeFileSync(path.join(OUT_DIR!, "blind-review.md"), out.join("\n") + "\n");
  fs.writeFileSync(path.join(OUT_DIR!, "blind-review-KEY.md"), key.join("\n") + "\n");

  const post: string[] = ["# Post drafts, side by side (same quotes given to every setup)\n"];
  const byT: Record<string, string[]> = {};
  for (const k of Object.keys(res.posts)) { const [tk] = k.split("|"); (byT[tk] ??= []).push(k); }
  Object.keys(byT).forEach((tk, ti) => { post.push(`\n## Recording ${ti + 1}\n`); const keys = shuffle(byT[tk], ti + 3); keys.forEach((k, i) => { const p = res.posts[k]; post.push(`**Setup ${String.fromCharCode(65 + i)}**`); for (const x of p.posts ?? []) post.push(`- (${x.platform}, for quote ${x.quoteIndex}) ${x.copy}`); post.push(""); }); post.push("KEY: " + keys.map((k, i) => `${String.fromCharCode(65 + i)}=${k.split("|")[1]}`).join(", ") + "\n"); });
  fs.writeFileSync(path.join(OUT_DIR!, "posts-review.md"), post.join("\n") + "\n");
}

const mode = process.argv[2];
(async () => { if (mode === "run") await run(); else if (mode === "analyze") analyze(); else console.log("usage: run | analyze"); await prisma.$disconnect(); })();
