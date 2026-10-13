"use client";

import { useEffect, useState } from "react";

/** Fallback for browsers that refuse the async clipboard API: select a throwaway textarea and use the older copy command. */
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

/** Copy — and, where the phone supports it, Share — a piece of text like a flagged quote or a drafted post. */
export function TextActions({ text, label }: { text: string; label: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Post-mount so the server-rendered HTML (no `navigator`) matches the first client render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(!!navigator.share);
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    setFeedback(ok ? "Copied" : "Couldn't copy");
    setTimeout(() => setFeedback(null), 1500);
  }

  function share() {
    // Called synchronously from the click so Safari still treats it as a user gesture.
    navigator.share({ text }).catch(() => {});
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="inline-flex min-h-11 items-center rounded-full bg-line px-5 text-sm font-medium text-ink hover:brightness-125"
      >
        {feedback ?? "Copy"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          aria-label={`Share ${label}`}
          className="inline-flex min-h-11 items-center rounded-full bg-line px-5 text-sm font-medium text-ink hover:brightness-125"
        >
          Share
        </button>
      )}
    </div>
  );
}
