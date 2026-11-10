"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { siciMatchMix } from "@/lib/basis";
import { MIX_KEYS, MIX_LABELS, type MixKey } from "@/lib/sici";
import { toSearchParams } from "@/lib/params";
import type { Horizon } from "@/lib/recommend";

const PROVIDERS = ["", "Lambda", "RunPod", "CoreWeave", "Vast.ai", "AWS", "GCP", "Azure", "Other"];

export default function InputForm() {
  const router = useRouter();
  const [spend, setSpend] = useState("10000");
  const [pct, setPct] = useState<Record<MixKey, string>>({
    h100: "100", b200: "", h200: "", a100: "", rtx4090: "", other: "",
  });
  const [horizon, setHorizon] = useState<Horizon>(3);
  const [provider, setProvider] = useState("");

  const total = useMemo(
    () => MIX_KEYS.reduce((s, k) => s + (Number(pct[k]) > 0 ? Number(pct[k]) : 0), 0),
    [pct],
  );
  const spendNum = Number(spend);
  const spendOk = Number.isFinite(spendNum) && spendNum > 0;
  const mixOk = total > 0;

  function matchSici() {
    const m = siciMatchMix();
    setPct({
      h100: String((m.h100 ?? 0) * 100), b200: String((m.b200 ?? 0) * 100),
      h200: String((m.h200 ?? 0) * 100), a100: String((m.a100 ?? 0) * 100),
      rtx4090: String((m.rtx4090 ?? 0) * 100), other: "",
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!spendOk || !mixOk) return;
    const mix: Partial<Record<MixKey, number>> = {};
    for (const k of MIX_KEYS) {
      const v = Number(pct[k]);
      if (v > 0) mix[k] = v / total; // normalised to fractions
    }
    const params = toSearchParams({
      monthlySpendUsd: spendNum,
      mix,
      horizonMonths: horizon,
      provider: provider || null,
      hedgeRatio: 1,
      profile: "balanced",
    });
    router.push(`/recommendation?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-2">
        <label htmlFor="spend" className="block text-sm font-medium">Monthly compute spend (USD)</label>
        <div className="flex items-center rounded-lg border border-line bg-panel focus-within:border-plum">
          <span className="pl-4 text-muted-foreground">$</span>
          <input id="spend" inputMode="decimal" value={spend} onChange={(e) => setSpend(e.target.value)}
            className="w-full bg-transparent px-2 py-3 text-lg outline-none" placeholder="10000" />
        </div>
        {!spendOk && <p className="text-sm text-bad">Enter a positive amount.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium">What do you rent? (share of your bill)</h2>
            <p className="text-xs text-muted-foreground">Percentages are normalised, so 60 / 40 or 3 / 2 both work.</p>
          </div>
          <button type="button" onClick={matchSici} className="text-xs text-plum underline-offset-4 hover:underline">
            Use SICI weights
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {MIX_KEYS.map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-2.5 focus-within:border-plum">
              <span className="text-sm">{MIX_LABELS[k]}</span>
              <span className="flex items-center gap-1">
                <input inputMode="decimal" value={pct[k]} onChange={(e) => setPct({ ...pct, [k]: e.target.value })}
                  className="w-16 rounded bg-panel2 px-2 py-1 text-right text-sm outline-none" placeholder="0" aria-label={`${MIX_LABELS[k]} percent`} />
                <span className="text-sm text-muted-foreground">%</span>
              </span>
            </label>
          ))}
        </div>
        <p className={`text-xs ${mixOk ? "text-muted-foreground" : "text-bad"}`}>
          {mixOk ? `Total entered: ${total}%` : "Enter a share for at least one chip."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Coverage horizon</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Coverage horizon">
          {([1, 3, 6] as Horizon[]).map((h) => (
            <button key={h} type="button" role="radio" aria-checked={horizon === h} onClick={() => setHorizon(h)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${horizon === h ? "border-plum bg-primary/10 text-plum" : "border-line bg-panel hover:border-muted"}`}>
              {h} month{h > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="prov" className="block text-sm font-medium">Current provider <span className="text-muted-foreground">(optional)</span></label>
        <select id="prov" value={provider} onChange={(e) => setProvider(e.target.value)}
          className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-plum">
          {PROVIDERS.map((p) => <option key={p} value={p}>{p || "— not specified —"}</option>)}
        </select>
      </section>

      <button type="submit" disabled={!spendOk || !mixOk}
        className="w-full rounded-lg bg-primary px-5 py-3.5 text-base font-semibold text-plum-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: "var(--accent-ink)" }}>
        Get my hedge recommendation
      </button>
    </form>
  );
}
