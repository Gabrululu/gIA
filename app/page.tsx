import Link from "next/link";
import Image from "next/image";
import { SICI_CHIPS, SICI_WEIGHTS, SICI_FIXTURE } from "@/lib/sici";
import { PROFILES } from "@/lib/recommend";
const signedPct = (n: number) => `+${Math.round(n * 100)}%`;

const steps = [
  ["Tell us your bill", "Monthly spend, which GPUs you rent, and how many months you want covered."],
  ["Get a capped call", "gIA sizes a monthly ladder of SICI call spreads and shows premium, payout and basis risk."],
  ["Simulate on testnet", "Run the mock Injective testnet adapter. Nothing is signed, sent or paid."],
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pt-16 md:px-10 md:pt-24">
        <p className="eyebrow rise">GPU Insurance Agent — (2026)</p>
        <h1 className="display rise mt-6 text-[clamp(3.5rem,11vw,11rem)]">
          Hedge the <em className="text-mauve">price</em>
          <br /> of compute.
        </h1>
        <div className="rise mt-10 grid gap-8 border-t border-border pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            AI teams that rent GPUs lose when rental rates go up. gIA recommends a fully collateralized, cash-settled capped call on SICI — so your worst case is a known premium.
          </p>
          <Link href="/start" className="w-fit rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            Get my hedge recommendation →
          </Link>
        </div>
      </section>

      <div className="mx-auto mt-16 max-w-7xl px-5 md:px-10">
        <Image src="/gia-hero.jpg" alt="Abstract GPU chip in frosted glass layers" width={1600} height={1008} className="rise aspect-[16/8] w-full rounded-lg object-cover" />
      </div>

      {/* Marquee */}
      <div className="mt-16 overflow-hidden border-y border-border py-5" aria-hidden>
        <div className="marquee flex w-max gap-12 whitespace-nowrap">
          {[0, 1].map((k) => (
            <span key={k} className="display flex gap-12 text-4xl text-steel">
              <span>Capped calls</span><span>·</span><span>European</span><span>·</span><span>Cash-settled in USDC</span><span>·</span><span>Fully collateralized</span><span>·</span><span>Injective testnet</span><span>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Approach */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[8rem_1fr] md:px-10">
        <span className="eyebrow">(01) Approach</span>
        <div>
          <h2 className="display text-[clamp(2.5rem,5vw,4.5rem)]">A budget you can plan around, not a perfect hedge.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
            {steps.map(([t, d], i) => (
              <div key={t} className="bg-card p-8">
                <span className="font-mono text-sm text-mauve">0{i + 1}</span>
                <h3 className="display mt-8 text-3xl">{t}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SICI */}
      <section className="bg-wine text-ice">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[8rem_1fr] md:px-10">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-steel">(02) The index</span>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="display text-[clamp(2.5rem,5vw,4.5rem)]">SICI — Super Intelligence Compute Index.</h2>
              <p className="mt-6 max-w-md text-steel">
                A physical GPU-rental index (USD per GPU-hour) built by LO:TECH and listed on Injective. Trailing 7-day average, 19:00 UTC daily fixing, each chip rebased to 100 on 22 Jul 2026.
              </p>
              <p className="display mt-10 text-8xl">{SICI_FIXTURE.level}<span className="ml-2 text-2xl text-steel">pts</span></p>
              <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-widest text-mauve">Fixture, not live: example level from Injective&apos;s Options launch post</p>
            </div>
            <ul className="self-end">
              {SICI_CHIPS.map((c) => (
                <li key={c.id} className="border-t border-mauve/50 py-4">
                  <div className="flex justify-between text-lg"><span>{c.label}</span><span className="num">{SICI_WEIGHTS[c.id] * 100}%</span></div>
                  <div className="mt-3 h-1 bg-plum"><div className="h-full bg-ice" style={{ width: `${SICI_WEIGHTS[c.id] * 250}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Profiles */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[8rem_1fr] md:px-10">
        <span className="eyebrow">(03) Profiles</span>
        <div>
          <h2 className="display text-[clamp(2.5rem,5vw,4.5rem)]">Choose how much of a rise you absorb.</h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {Object.values(PROFILES).map((p) => (
              <div key={p.label} className="grid gap-2 py-8 md:grid-cols-[1fr_1fr_2fr] md:items-baseline">
                <span className="display text-5xl">{p.label}</span>
                <span className="num font-mono text-sm text-plum">strike {signedPct(p.strikePct)} · cap {signedPct(p.capPct)}</span>
                <span className="text-muted-foreground">{p.blurb}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="rounded-lg bg-steel px-8 py-20 text-center md:py-28">
          <h2 className="display mx-auto max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] text-wine">Turn a floating GPU bill into a plan.</h2>
          <Link href="/start" className="mt-10 inline-block rounded-full bg-wine px-8 py-4 text-sm font-semibold text-ice transition hover:bg-plum">
            Start your hedge →
          </Link>
          <p className="mt-6 text-xs text-wine/70">Prototype on Injective testnet. Not financial advice.</p>
        </div>
      </section>
    </div>
  );
}
