"use client";

import { useState } from "react";

/**
 * A temporary diagnostic page (remove once the cause is known): the iPhone file
 * picker grayed out a valid MP3 for the Upload button, so this offers the same
 * picker asked for in different ways. Open it on the phone, try each button, and
 * note which ones let the MP3 be selected.
 */
const VARIANTS: { label: string; accept?: string }[] = [
  { label: "1. Current Upload list (before the audio endings were added)", accept: "video/*,audio/*,image/*,application/pdf" },
  { label: "2. Current Upload list (with audio endings)", accept: "video/*,audio/*,image/*,application/pdf,.mp3,.m4a,.wav,.aac,.aif,.aiff,.flac,.ogg,.opus,.amr,.caf" },
  { label: "3. Any audio only", accept: "audio/*" },
  { label: "4. MP3 by type", accept: "audio/mpeg" },
  { label: "5. MP3 by ending", accept: ".mp3" },
  { label: "6. Audio by type and endings", accept: "audio/*,.mp3,.m4a,.wav" },
  { label: "7. Anything (no filter)" },
];

export default function PickerTestPage() {
  const [picked, setPicked] = useState<Record<number, string>>({});

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-32 pt-8">
      <h1 className="font-display text-2xl font-extrabold">File picker test</h1>
      <p className="mt-2 text-sm text-muted">
        For each button: tap it, choose <strong>Choose File</strong>, and see whether your MP3 can be selected or is
        grayed out. When one works, the page shows the file&apos;s name, type and size. Nothing is uploaded here.
      </p>
      <ul className="mt-6 flex flex-col gap-5">
        {VARIANTS.map((v, i) => (
          <li key={i} className="rounded-2xl bg-surface p-4">
            <p className="text-sm font-semibold">{v.label}</p>
            <p className="mt-1 break-all text-xs text-muted">accept: {v.accept ?? "(none)"}</p>
            <input
              type="file"
              accept={v.accept}
              className="mt-3 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPicked((p) => ({ ...p, [i]: f ? `${f.name} · type "${f.type || "(blank)"}" · ${(f.size / 1e6).toFixed(1)} MB` : "(nothing)" }));
              }}
            />
            {picked[i] && <p className="mt-2 break-all text-xs text-mint">Selected: {picked[i]}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
