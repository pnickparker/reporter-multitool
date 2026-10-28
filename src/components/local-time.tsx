"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * A date and time shown on the viewer's own clock and time zone, like "Oct 27, 4:12 PM CDT".
 * The server doesn't know the reporter's time zone, so it renders nothing and the browser
 * fills the time in right after the page loads (rather than showing the server's time by mistake).
 */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscription,
    () =>
      new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    () => "",
  );

  return <time dateTime={iso}>{text}</time>;
}
