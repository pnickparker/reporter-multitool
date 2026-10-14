import Link from "next/link";
import { prisma } from "@/lib/db";

/**
 * What processing has actually cost, from the usage log (see lib/usage). Not linked
 * from anywhere in the app: it's for Nick's pricing work. Figures are estimates at
 * list prices, not an invoice.
 */
const dollars = (n: number) => (n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000);

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = Math.min(365, Math.max(1, Number(daysParam) || 30));
  const since = daysAgo(days);

  const records = await prisma.usageRecord.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" } });
  const assetIds = [...new Set(records.map((r) => r.assetId))];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, type: true, duration: true, project: { select: { name: true } } },
  });
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const alerts = await prisma.alertLog.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10 });

  const total = records.reduce((s, r) => s + r.costUsd, 0);
  const transcription = records.filter((r) => r.kind === "transcription");
  const audioHours = transcription.reduce((s, r) => s + (r.audioSeconds ?? 0), 0) / 3600;
  const aiCost = records.filter((r) => r.kind !== "transcription").reduce((s, r) => s + r.costUsd, 0);

  // One row per recording
  const perRecording = assetIds
    .map((id) => {
      const mine = records.filter((r) => r.assetId === id);
      const sum = (kind: string) => mine.filter((r) => r.kind === kind).reduce((s, r) => s + r.costUsd, 0);
      const seconds = mine.find((r) => r.kind === "transcription")?.audioSeconds ?? null;
      return { id, when: mine[0].createdAt, seconds, t: sum("transcription"), q: sum("quotes"), p: sum("posts"), all: mine.reduce((s, r) => s + r.costUsd, 0) };
    })
    .sort((a, b) => b.when.getTime() - a.when.getTime());

  const byModel = new Map<string, { runs: number; input: number; output: number; cost: number }>();
  for (const r of records.filter((r) => r.kind !== "transcription")) {
    const m = byModel.get(r.model) ?? { runs: 0, input: 0, output: 0, cost: 0 };
    m.runs++; m.input += r.inputTokens ?? 0; m.output += r.outputTokens ?? 0; m.cost += r.costUsd;
    byModel.set(r.model, m);
  }

  const stat = (label: string, value: string, note?: string) => (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8">
      <Link href="/" className="link-action -ml-2 text-muted">
        &larr; Home
      </Link>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">What processing costs</h1>
      <p className="mt-2 text-sm text-muted">
        Last {days} days. Estimated at list prices (see <code>src/lib/usage/pricing.ts</code>), not an invoice — the vendors&apos; bills are the truth.
        Only recordings processed since the log was added appear here.
      </p>

      {records.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-surface p-4 text-sm text-muted">Nothing logged yet — process a recording and it will show up here.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stat("Recordings", String(assetIds.length))}
            {stat("Total cost", dollars(total))}
            {stat("Per recording", dollars(total / assetIds.length), "average")}
            {stat("Per audio hour", audioHours > 0 ? dollars(total / audioHours) : "—", `${audioHours.toFixed(1)} h processed`)}
          </div>
          <p className="mt-3 text-sm text-muted">
            Transcription {dollars(total - aiCost)} · AI steps (quotes and posts) {dollars(aiCost)}
          </p>

          <h2 className="mt-8 font-display text-xl font-extrabold">AI model use</h2>
          <div className="mt-2 overflow-x-auto rounded-2xl bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-4 py-2">Model</th><th className="px-4 py-2">Calls</th><th className="px-4 py-2">Tokens in</th><th className="px-4 py-2">Tokens out</th><th className="px-4 py-2">Cost</th></tr>
              </thead>
              <tbody>
                {[...byModel.entries()].map(([model, m]) => (
                  <tr key={model} className="border-t border-line">
                    <td className="px-4 py-2">{model}</td><td className="px-4 py-2">{m.runs}</td><td className="px-4 py-2">{m.input.toLocaleString()}</td><td className="px-4 py-2">{m.output.toLocaleString()}</td><td className="px-4 py-2">{dollars(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 font-display text-xl font-extrabold">Recordings</h2>
          <div className="mt-2 overflow-x-auto rounded-2xl bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Project</th><th className="px-4 py-2">Length</th><th className="px-4 py-2">Transcription</th><th className="px-4 py-2">Quotes</th><th className="px-4 py-2">Posts</th><th className="px-4 py-2">Total</th></tr>
              </thead>
              <tbody>
                {perRecording.slice(0, 60).map((r) => {
                  const a = assetById.get(r.id);
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2 whitespace-nowrap">{r.when.toISOString().slice(5, 16).replace("T", " ")}Z</td>
                      <td className="px-4 py-2">{a ? a.project.name : "(deleted)"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.seconds ? `${(r.seconds / 60).toFixed(1)} min` : "—"}</td>
                      <td className="px-4 py-2">{dollars(r.t)}</td><td className="px-4 py-2">{dollars(r.q)}</td><td className="px-4 py-2">{dollars(r.p)}</td>
                      <td className="px-4 py-2 font-semibold">{dollars(r.all)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-8 font-display text-xl font-extrabold">Recent alerts</h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None in this period.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-2xl bg-surface px-4 py-2">
              <span className="text-xs text-muted">{a.createdAt.toISOString().slice(5, 16).replace("T", " ")}Z · {a.delivered ? "emailed" : "not emailed (no email set up)"}</span>
              <br />
              {a.subject}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
