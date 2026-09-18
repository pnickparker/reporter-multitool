"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PENDING_STATUSES = new Set(["UPLOADING", "TRANSCRIBING", "GENERATING"]);

/**
 * Refreshes the page every few seconds while any asset is still processing,
 * so status changes (e.g. TRANSCRIBING -> READY) show up without a manual
 * reload. Stops polling once nothing is pending.
 */
export function AssetStatusPoller({ statuses }: { statuses: string[] }) {
  const router = useRouter();
  const hasPending = statuses.some((status) => PENDING_STATUSES.has(status));

  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [hasPending, router]);

  return null;
}
