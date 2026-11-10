"use client";

import { useState } from "react";
import SiciReference from "./SiciReference";
import type { SiciPrint } from "@/lib/sici";

interface Fill {
  orderId: string; simulated: boolean; premiumUsd: number; maxPayoutUsd: number;
  collateralLockedByWriterUsd: number; txHash: string | null; note: string;
  order: { strike: number; cap: number; expiry: string; contracts: number };
}
interface Result { sici: SiciPrint; status: { adapter: string; live: boolean; detail: string }; fills: Fill[] }

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function HedgeButton({ query }: { query: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function go() {
    setState("loading");
    try {
      const res = await fetch("/api/hedge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data); setState("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); setState("error"); }
  }

  return (
    <div className="space-y-4">
      <button onClick={go} disabled={state === "loading"}
        className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold hover:brightness-110 disabled:opacity-50"
        style={{ color: "var(--accent-ink)" }}>
        {state === "loading" ? "Placing simulated order…" : "Hedge this budget"}
      </button>
      <p className="text-xs text-muted-foreground">This runs the mocked testnet adapter. Nothing is signed, sent or paid.</p>

      {state === "error" && <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{error}</p>}

      {state === "done" && result && (
        <div className="space-y-3" aria-live="polite">
          <div className="rounded-lg border border-warn/50 bg-warn/10 p-4 text-sm text-warn">
            <strong>SIMULATED.</strong> {result.status.detail}
          </div>
          <p className="text-xs text-muted-foreground">Recalculated using the reference below at simulation time. Values may differ from the preview.</p>
          <SiciReference sici={result.sici} />
          {result.fills.map((f) => (
            <div key={f.orderId} className="rounded-lg border border-line bg-panel p-4 text-sm tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono">{f.orderId}</span>
                <span className="rounded-full border border-warn/50 px-2 py-0.5 text-xs text-warn">simulated fill · no tx</span>
              </div>
              <p className="mt-2 text-muted-foreground">
                SICI capped call {f.order.strike}/{f.order.cap} · {f.order.contracts.toLocaleString("en-US")} contracts · expires {f.order.expiry.slice(0, 10)} 19:00 UTC
              </p>
              <p className="mt-1">Premium {usd(f.premiumUsd)} · max payout {usd(f.maxPayoutUsd)} · writer would lock {usd(f.collateralLockedByWriterUsd)} USDC</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
