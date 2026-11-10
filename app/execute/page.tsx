import Link from "next/link";
import { Suspense } from "react";
import HedgeButton from "@/components/HedgeButton";
import { getAdapter } from "@/lib/adapter";
import { TESTNET } from "@/lib/adapter/types";
import { parseInput, toSearchParams, type RawParams } from "@/lib/params";
import { recommend, usd } from "@/lib/recommend";
import { planRolloverPolicy } from "@/lib/rollover";
import { getSiciPrint } from "@/lib/sici";

export const metadata = { title: "Execute — GIA" };

async function Content({ searchParams }: { searchParams: Promise<RawParams> }) {
  const parsed = parseInput(await searchParams);
  if (!parsed.ok) {
    return (<div className="space-y-4"><p className="text-bad">{parsed.error}</p><Link href="/start" className="text-plum underline">Back to the form</Link></div>);
  }
  const sici = await getSiciPrint();
  const rec = recommend(parsed.input, sici);
  const status = await getAdapter().status();
  const policy = planRolloverPolicy(rec.legs);
  const query = toSearchParams(rec.input).toString();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={`/recommendation?${query}`} className="text-sm text-muted-foreground hover:text-fg">← Back to recommendation</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Execute on Injective testnet</h1>
      </div>

      <section className="rounded-xl border border-line bg-panel p-5 text-sm">
        <p className="text-muted-foreground">You are about to hedge</p>
        <p className="mt-1 text-lg">{usd(rec.totals.budgetUsd)} of compute over {rec.input.horizonMonths} month{rec.input.horizonMonths > 1 ? "s" : ""}</p>
        <p className="mt-2 text-muted-foreground">Premium ≈ {usd(rec.totals.premiumUsd)} (your worst case) · max payout {usd(rec.totals.maxPayoutUsd)} · {rec.legs.length} capped call{rec.legs.length > 1 ? "s" : ""} on SICI</p>
        {rec.basis.severity !== "low" && (
          <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-warn">Basis risk is {rec.basis.severity}: this will not cancel your whole bill increase. See the recommendation screen.</p>
        )}
      </section>

      <section className="rounded-xl border border-warn/40 bg-warn/5 p-5 text-sm">
        <p className="font-medium text-warn">Adapter: {status.adapter} ({status.live ? "live" : "not live"})</p>
        <p className="mt-1 text-muted-foreground">{status.detail}</p>
        <p className="mt-2 text-muted-foreground">This is the Oct-2026 Options primitive (fully collateralized, cash-settled European options), not Injective&apos;s older Binary Options (0–1 event) markets.</p>
      </section>

      <HedgeButton query={query} />

      <section className="space-y-3 rounded-xl border border-line bg-panel p-5 text-sm">
        <h2 className="font-semibold">Auto-roll (design only, not built)</h2>
        <p className="text-muted-foreground">Options expire, so coverage needs rolling. The plan is an AuthZ-scoped agent that buys the next call before expiry without a monthly signature, limited to the options-buy message, with a spending cap and an expiry on the grant. Not enabled in v1.</p>
        <pre className="overflow-x-auto rounded-lg bg-panel2 p-3 text-xs">{JSON.stringify({ ...policy, messageTypes: policy.messageTypes.length ? policy.messageTypes : ["TODO: Options buy message type (not yet published)"] }, null, 2)}</pre>
      </section>

      <section className="text-xs text-muted-foreground">
        <p>Testnet resources: <a className="underline" href={TESTNET.faucets.inj}>INJ faucet</a> · <a className="underline" href={TESTNET.faucets.usdc}>Circle USDC faucet</a> · <a className="underline" href={TESTNET.explorerEvm}>EVM explorer</a> · EVM chain ID {TESTNET.evmChainId} ({TESTNET.cosmosChainId})</p>
        <p className="mt-1">GIA never custodies keys. A real version would sign in your own wallet.</p>
      </section>
    </div>
  );
}

export default function ExecutePage(props: { searchParams: Promise<RawParams> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground" role="status">Loading your hedge…</p>}>
      <div className="workflow mx-auto max-w-7xl px-5 py-14 md:px-10"><Content searchParams={props.searchParams} /></div>
    </Suspense>
  );
}
