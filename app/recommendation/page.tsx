import Link from "next/link";
import { Suspense } from "react";
import BasisBadge from "@/components/BasisBadge";
import CopyLink from "@/components/CopyLink";
import PayoffChart from "@/components/PayoffChart";
import { parseInput, toSearchParams, type RawParams } from "@/lib/params";
import { PROFILES, recommend, scenario, usd, type ProfileId } from "@/lib/recommend";
import { getSiciPrint } from "@/lib/sici";
import { MIX_KEYS, MIX_LABELS } from "@/lib/sici";

export const metadata = { title: "Your hedge — GIA" };

async function Content({ searchParams }: { searchParams: Promise<RawParams> }) {
  const parsed = parseInput(await searchParams);
  if (!parsed.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">We need a bit more information</h1>
        <p className="text-bad">{parsed.error}</p>
        <Link href="/start" className="text-plum underline">Back to the form</Link>
      </div>
    );
  }
  const sici = await getSiciPrint();
  const rec = recommend(parsed.input, sici);
  const { input, totals, legs } = rec;
  const S0 = sici.level;
  const leg0 = legs[0];

  const withInput = (patch: Partial<typeof input>) =>
    `/recommendation?${toSearchParams({ ...input, ...patch }).toString()}`;

  const scenarios = [-0.1, 0, 0.1, 0.2, 0.3, 0.5].map((x) => {
    const level = S0 * (1 + x);
    const s = scenario(rec, level);
    return { x, level, extraCost: Math.max(0, input.monthlySpendUsd * x), ...s };
  });
  const mixText = MIX_KEYS.filter((k) => (input.mix[k] ?? 0) > 0)
    .map((k) => `${MIX_LABELS[k]} ${Math.round((input.mix[k] ?? 0) * 100)}%`).join(" · ");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{usd(input.monthlySpendUsd)}/month · {input.horizonMonths} month{input.horizonMonths > 1 ? "s" : ""} · {mixText}{input.provider ? ` · ${input.provider}` : ""}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your recommended hedge</h1>
        </div>
        <div className="flex gap-2">
          <CopyLink />
          <Link href="/start" className="rounded-lg border border-line px-4 py-2 text-sm hover:border-plum">Edit inputs</Link>
        </div>
      </div>

      <section className="rounded-2xl border border-plum/40 bg-primary/5 p-6">
        <p className="text-lg leading-relaxed">{rec.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          SICI level used: <strong className="text-fg">{S0} pts</strong> ({sici.source === "fixture" ? "FIXTURE, not live" : "live"}). {sici.note}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total premium (worst case)", usd(totals.premiumUsd), `${(totals.premiumPctOfBudget * 100).toFixed(1)}% of ${usd(totals.budgetUsd)} budget`],
          ["Max payout", usd(totals.maxPayoutUsd), `across ${legs.length} option${legs.length > 1 ? "s" : ""}`],
          ["Hedge starts paying at", `${leg0.strike} pts`, `+${(totals.strikePctActual * 100).toFixed(1)}% vs now`],
          ["Max payout reached at", `${leg0.cap} pts`, `+${(totals.capPctActual * 100).toFixed(1)}% vs now`],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </section>

      <BasisBadge basis={rec.basis} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How much of a rise you absorb</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PROFILES) as ProfileId[]).map((p) => (
            <Link key={p} href={withInput({ profile: p })} scroll={false}
              className={`rounded-xl border p-4 transition ${input.profile === p ? "border-plum bg-primary/10" : "border-line bg-panel hover:border-muted"}`}>
              <p className="font-medium">{PROFILES[p].label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{PROFILES[p].blurb}</p>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Share of spend hedged:</span>
          {[0.5, 0.75, 1].map((r) => (
            <Link key={r} href={withInput({ hedgeRatio: r })} scroll={false}
              className={`rounded-full border px-3 py-1 ${Math.abs(input.hedgeRatio - r) < 1e-6 ? "border-plum text-plum" : "border-line text-muted-foreground hover:border-muted"}`}>
              {Math.round(r * 100)}%
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The position: a monthly ladder of capped calls</h2>
        <p className="text-sm text-muted-foreground">
          Options are European, so each one only looks at the rate on its expiry day. One option per month
          gives each month&apos;s bill its own cover. All are calls (you lose when rates rise); none are puts.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-xs text-muted-foreground">
              <tr>{["Month", "Expiry (19:00 UTC fixing)", "Strike / cap", "Contracts", "Premium (est.)", "Max payout", "Breakeven"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {legs.map((l) => (
                <tr key={l.month} className="border-t border-line/60 tabular-nums">
                  <td className="px-3 py-2">{l.month}</td>
                  <td className="px-3 py-2">{l.expiry.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{l.strike} / {l.cap}</td>
                  <td className="px-3 py-2">{l.contracts.toLocaleString("en-US")}</td>
                  <td className="px-3 py-2">{usd(l.premiumUsd)} <span className="text-muted-foreground">(${l.premiumPerContractUsd.toFixed(3)}/ct)</span></td>
                  <td className="px-3 py-2">{usd(l.maxPayoutUsd)}</td>
                  <td className="px-3 py-2">{l.breakevenIndex.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Each contract pays $0.01 per index point between strike and cap. Expiry dates are targets; the real series are whatever Injective lists.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Payoff of one monthly option</h2>
          <div className="rounded-xl border border-line bg-panel p-3"><PayoffChart leg={leg0} spot={S0} /></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">What-if for month 1</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="bg-panel text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">SICI at expiry</th><th className="px-3 font-medium">Extra rental cost*</th><th className="px-3 font-medium">Hedge pays</th><th className="px-3 font-medium">Net of premium</th></tr></thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.x} className="border-t border-line/60">
                    <td className="px-3 py-2">{s.level.toFixed(0)} ({s.x >= 0 ? "+" : ""}{Math.round(s.x * 100)}%)</td>
                    <td className="px-3">{usd(s.extraCost)}</td>
                    <td className="px-3">{usd(s.payoutUsd)}</td>
                    <td className={`px-3 ${s.netUsd < 0 ? "text-bad" : "text-ok"}`}>{s.netUsd < 0 ? "−" : "+"}{usd(Math.abs(s.netUsd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">*Assumes your bill moves 1:1 with SICI at full hedge. With basis risk it will not; see above.</p>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-semibold">Read before you trade</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{rec.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>

      <div className="flex justify-end">
        <Link href={`/execute?${toSearchParams(input).toString()}`}
          className="rounded-lg bg-primary px-6 py-3 font-semibold hover:brightness-110" style={{ color: "var(--accent-ink)" }}>
          Continue to execution →
        </Link>
      </div>
    </div>
  );
}

export default function RecommendationPage(props: { searchParams: Promise<RawParams> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground" role="status">Loading your hedge…</p>}>
      <div className="workflow mx-auto max-w-7xl px-5 py-14 md:px-10"><Content searchParams={props.searchParams} /></div>
    </Suspense>
  );
}
