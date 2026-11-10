import type { BasisAssessment } from "@/lib/basis";

const STYLE = {
  low: { ring: "border-ok/40 bg-ok/10 text-ok", label: "Low basis risk" },
  moderate: { ring: "border-warn/40 bg-warn/10 text-warn", label: "Moderate basis risk" },
  high: { ring: "border-bad/40 bg-bad/10 text-bad", label: "High basis risk" },
} as const;

export default function BasisBadge({ basis }: { basis: BasisAssessment }) {
  const s = STYLE[basis.severity];
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <section className={`rounded-xl border p-5 ${s.ring}`} aria-label="Basis risk">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-current px-3 py-0.5 text-xs font-semibold uppercase tracking-wide">
          {basis.matchesSici ? "Mix ≈ SICI" : s.label}
        </span>
        <span className="text-sm text-fg">{basis.headline}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Your mix differs from SICI&apos;s fixed weights by {pct(basis.divergence)} (0% = identical). This is a hedge on a
        5-chip, 7-day-average basket, <strong className="text-fg">not a perfect hedge of your own bill</strong>.
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {basis.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-fg">If only one chip&apos;s price rises 20%…</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="py-1 pr-3 font-medium">Chip</th><th className="px-3 font-medium">Your bill</th><th className="px-3 font-medium">SICI</th><th className="pl-3 font-medium">Hedge covers</th></tr>
            </thead>
            <tbody>
              {basis.stress.map((r) => (
                <tr key={r.chip} className="border-t border-line/60">
                  <td className="py-1.5 pr-3">{r.label}</td>
                  <td className="px-3 tabular-nums">{r.billChange > 0 ? `+${(r.billChange * 100).toFixed(1)}%` : "—"}</td>
                  <td className="px-3 tabular-nums">{r.siciChange > 0 ? `+${(r.siciChange * 100).toFixed(1)}%` : "—"}</td>
                  <td className="pl-3 tabular-nums">
                    {r.billChange > 0 ? `${Math.round(r.hedgeRatio * 100)}% of the increase` : r.siciChange > 0 ? "pays, but you don't rent it" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Illustrative single-chip shock; real moves are correlated. Ignores strike/cap.</p>
      </details>
    </section>
  );
}
