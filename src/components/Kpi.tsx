export function Kpi({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "border-mint/30 bg-mint/[0.06]" : ""}`}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${accent ? "text-mint" : ""}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-faint">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "mint" | "amber" | "danger" | "muted" | "sky"; children: React.ReactNode }) {
  const tones = {
    mint: "bg-mint/15 text-mint",
    amber: "bg-amber/15 text-amber",
    danger: "bg-danger/15 text-danger",
    muted: "bg-surface-3 text-muted",
    sky: "bg-sky/15 text-sky",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}
