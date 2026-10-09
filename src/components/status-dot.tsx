export type DotState = "ready" | "working" | "error" | "idle";

const COLORS: Record<DotState, string> = {
  ready: "bg-mint",
  working: "bg-violet-soft animate-pulse",
  error: "bg-danger",
  idle: "bg-line",
};

const LABELS: Record<DotState, string> = {
  ready: "Ready",
  working: "Working",
  error: "Needs attention",
  idle: "Empty",
};

export function StatusDot({ state }: { state: DotState }) {
  return (
    <span
      role="img"
      aria-label={LABELS[state]}
      title={LABELS[state]}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[state]}`}
    />
  );
}
