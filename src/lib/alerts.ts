import { prisma } from "@/lib/db";

/**
 * Tells Nick when a recording fails to process, so he hears about problems before a
 * customer does. An email is sent through Resend when RESEND_API_KEY and ALERT_EMAIL_TO
 * are set; without them the alert is only logged (and shown on the usage page), so this
 * is safe to ship before email is set up. Optional: ALERT_EMAIL_FROM.
 *
 * An alert never contains a recording's content — only its project name, type, size,
 * length, the error, and a link. The same problem is not sent twice within 6 hours, and
 * no more than 10 alerts go out in an hour, so a bad day can't flood an inbox. Sending
 * is best effort: a failure here is logged and never affects the recording.
 */
const SAME_PROBLEM_COOLDOWN_MS = 6 * 3600 * 1000;
const MAX_ALERTS_PER_HOUR = 10;

async function sendEmail(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !to) {
    console.warn(`ALERT (email not set up): ${subject}`);
    return false;
  }
  const base = process.env.ALERT_API_BASE ?? "https://api.resend.com";
  const res = await fetch(`${base}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM ?? "Mobile News Bureau <onboarding@resend.dev>",
      to: to.split(",").map((address) => address.trim()).filter(Boolean),
      subject,
      text: body,
    }),
  });
  if (!res.ok) console.error(`Alert email was refused (${res.status})`);
  return res.ok;
}

export async function alertOwner(args: { key: string; subject: string; body: string }): Promise<void> {
  try {
    const repeat = await prisma.alertLog.findFirst({
      where: { key: args.key, createdAt: { gte: new Date(Date.now() - SAME_PROBLEM_COOLDOWN_MS) } },
    });
    if (repeat) return;
    const recent = await prisma.alertLog.count({ where: { createdAt: { gte: new Date(Date.now() - 3600 * 1000) } } });
    if (recent >= MAX_ALERTS_PER_HOUR) return;
    const delivered = await sendEmail(args.subject, args.body);
    await prisma.alertLog.create({ data: { key: args.key, subject: args.subject, delivered } });
  } catch (err) {
    console.error("Couldn't send an alert:", err);
  }
}

/** An alert about one recording: looks up its basic facts (never its content) and says what happened. */
export async function alertAssetProblem(assetId: string, headline: string, whatHappened: string): Promise<void> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { type: true, uploadedAt: true, fileSizeBytes: true, duration: true, projectId: true, project: { select: { name: true } } },
    });
    const site = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "reporter-multitool.vercel.app"}`;
    const facts = asset
      ? [
          `Project: ${asset.project.name}`,
          `Type: ${asset.type}`,
          `Uploaded: ${asset.uploadedAt.toISOString()}`,
          asset.fileSizeBytes ? `Size: ${(asset.fileSizeBytes / 1e6).toFixed(0)} MB` : null,
          asset.duration ? `Length: ${(asset.duration / 60).toFixed(1)} min` : null,
          `Open: ${site}/projects/${asset.projectId}`,
        ].filter(Boolean)
      : ["(the recording no longer exists)"];
    await alertOwner({
      key: `asset:${assetId}:${headline}`,
      subject: `Mobile News Bureau: ${headline}`,
      body: `${headline}\n\n${facts.join("\n")}\n\nWhat happened: ${whatHappened}\n\nThe recording itself is safe in Drive; open the project to retry (Transcribe now) or share the original.`,
    });
  } catch (err) {
    console.error("Couldn't prepare an alert:", err);
  }
}
