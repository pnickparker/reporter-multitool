import "dotenv/config";
import { prisma } from "./src/lib/db";
const a0 = await prisma.asset.findFirst({ where: { uploadedAt: { gte: new Date(Date.now() - 2 * 3600 * 1000) } }, orderBy: { uploadedAt: "desc" } });
if (!a0) { console.log("no asset"); process.exit(0); }
const id = a0.id; const t0 = Date.now(); let last = "";
console.log("watching", id.slice(-6), "started", a0.uploadedAt.toISOString().slice(11, 19) + "Z");
while (Date.now() - t0 < 340_000) {
  const a = await prisma.asset.findUnique({ where: { id }, include: { transcript: { select: { text: true } }, flaggedQuotes: { select: { id: true } } } });
  const state = `${a!.status} | ${a!.fileSizeBytes ? (a!.fileSizeBytes / 1e6).toFixed(0) + "MB" : "size?"} | dur ${a!.duration ?? "?"}s | transcript ${a!.transcript ? a!.transcript.text.split(/\s+/).length + "w" : "no"} | quotes ${a!.flaggedQuotes.length}${a!.errorMessage ? " | " + a!.errorMessage.slice(0, 110) : ""}`;
  if (state !== last) { console.log(new Date().toISOString().slice(11, 19) + "Z  " + state); last = state; }
  if (a!.status !== "UPLOADING") break;
  await new Promise((r) => setTimeout(r, 6000));
}
await prisma.$disconnect();
