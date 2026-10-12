import "dotenv/config";
import { prisma } from "./src/lib/db";
const id = (await prisma.asset.findFirstOrThrow({ where: { id: { endsWith: "dkiu1h" } } })).id;
const t0 = Date.now(); let last = "";
while (Date.now() - t0 < 345_000) {
  const a = await prisma.asset.findUnique({ where: { id }, include: { transcript: { select: { text: true, segments: true } }, flaggedQuotes: { select: { id: true, engagementScore: true } }, socialPosts: { select: { id: true } } } });
  const since = a!.processingStartedAt ? `+${Math.round((Date.now() - a!.processingStartedAt.getTime()) / 1000)}s` : "";
  const segs = (a!.transcript?.segments as any[]) ?? [];
  const state = `${a!.status} | transcript ${a!.transcript ? a!.transcript.text.split(/\s+/).length + "w/" + segs.length + " turns/speakers " + [...new Set(segs.map((s) => s.speaker))].join("") : "no"} | quotes ${a!.flaggedQuotes.length} | posts ${a!.socialPosts.length}${a!.errorMessage ? " | " + a!.errorMessage.slice(0, 100) : ""}`;
  if (state !== last) { console.log(new Date().toISOString().slice(11, 19) + "Z " + since + "  " + state); last = state; }
  if (a!.status === "READY" || a!.status === "ERROR") break;
  await new Promise((r) => setTimeout(r, 5000));
}
await prisma.$disconnect();
