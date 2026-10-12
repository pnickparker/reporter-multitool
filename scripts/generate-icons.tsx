/**
 * Draws the app icon — a white record circle on the app's violet — at every size
 * the browser, phone home screen and install manifest need. Run it again if the
 * design changes:  npx tsx scripts/generate-icons.tsx
 *
 * The mark is the same "record" button as on the Home screen, so it doesn't
 * depend on the app's name. Phones round the corners themselves, so the icon is
 * a plain full-bleed square, with the circle kept well inside the edges (the
 * same file doubles as the "maskable" version that Android crops into shapes).
 */
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

const VIOLET = "#7c3aed";

function Icon({ size }: { size: number }) {
  const outer = Math.round(size * 0.58);
  const inner = Math.round(outer * 0.4);
  return (
    <div
      style={{ width: size, height: size, background: VIOLET, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{ width: outer, height: outer, borderRadius: outer, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ width: inner, height: inner, borderRadius: inner, background: VIOLET }} />
      </div>
    </div>
  );
}

const targets: { file: string; size: number }[] = [
  { file: "src/app/icon.png", size: 192 }, // browser tab (shown small); Next adds the link tags
  { file: "src/app/apple-icon.png", size: 180 }, // iPhone home screen; Next adds the link tag
  { file: "public/icon-192.png", size: 192 }, // install manifest
  { file: "public/icon-512.png", size: 512 }, // install manifest
];

async function main() {
  for (const { file, size } of targets) {
    const res = new ImageResponse(<Icon size={size} />, { width: size, height: size });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    console.log("wrote", file, size + "x" + size);
  }
}

void main();
