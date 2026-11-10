import { describe, expect, it } from "vitest";
import { assessBasisRisk, siciMatchMix } from "@/lib/basis";
import { normCdf, estimatePremium, payoffPoints } from "@/lib/pricing";
import { recommend } from "@/lib/recommend";
import { SICI_CHIPS } from "@/lib/sici";
import { parseInput, toSearchParams } from "@/lib/params";
import { MockTestnetAdapter } from "@/lib/adapter/mock";
import { legToOrder } from "@/lib/adapter/types";

const base = { monthlySpendUsd: 10000, provider: null, hedgeRatio: 1, profile: "balanced" as const };

describe("SICI weights", () => {
  it("sum to 1 and match LO:TECH", () => {
    expect(SICI_CHIPS.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1);
    expect(SICI_CHIPS.map((c) => c.weight)).toEqual([0.4, 0.25, 0.15, 0.1, 0.1]);
  });
});

describe("pricing", () => {
  it("normCdf sanity", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it("premium is within (0, max payout]", () => {
    const e = estimatePremium({ spot: 113, strike: 119, cap: 147, years: 0.25 });
    expect(e.premiumPerContractUsd).toBeGreaterThan(0);
    expect(e.premiumPerContractUsd).toBeLessThanOrEqual(0.28);
  });
  it("longer expiry costs more", () => {
    const a = estimatePremium({ spot: 113, strike: 119, cap: 147, years: 1 / 12 });
    const b = estimatePremium({ spot: 113, strike: 119, cap: 147, years: 0.5 });
    expect(b.premiumPerContractUsd).toBeGreaterThan(a.premiumPerContractUsd);
  });
  it("matches the worked example payoff in Injective's post", () => {
    // strike 113, cap 123, 100 contracts x 0.01
    expect(payoffPoints(119, 113, 123) * 0.01 * 100).toBeCloseTo(6);
    expect(payoffPoints(125, 113, 123) * 0.01 * 100).toBeCloseTo(10);
    expect(payoffPoints(110, 113, 123)).toBe(0);
  });
});

describe("basis risk", () => {
  it("SICI-matching mix has ~0 divergence", () => {
    const b = assessBasisRisk(siciMatchMix());
    expect(b.divergence).toBeLessThan(0.001);
    expect(b.matchesSici).toBe(true);
  });
  it("100% H100 is flagged and gets 40% hedge ratio on an H100 shock", () => {
    const b = assessBasisRisk({ h100: 1 });
    expect(b.divergence).toBeCloseTo(0.6);
    expect(b.severity).toBe("high");
    const row = b.stress.find((r) => r.chip === "h100")!;
    expect(row.hedgeRatio).toBeCloseTo(0.4);
  });
  it("100% other is fully untracked", () => {
    const b = assessBasisRisk({ other: 1 });
    expect(b.trackedShare).toBe(0);
    expect(b.divergence).toBeCloseTo(1);
  });
});

describe("recommendation", () => {
  const rec = recommend({ ...base, mix: { h100: 1 }, horizonMonths: 3 }, undefined, new Date("2026-11-10T00:00:00Z"));
  it("is a call ladder, never a put", () => {
    expect(rec.legs).toHaveLength(3);
    for (const l of rec.legs) { expect(l.cap).toBeGreaterThan(l.strike); expect(l.strike).toBeGreaterThanOrEqual(113); }
  });
  it("sizes contracts so slope matches spend/index", () => {
    // 10000 / (0.01 * 113) = 8849.56
    expect(rec.legs[0].contracts).toBe(8850);
  });
  it("expiries are 19:00 UTC", () => {
    expect(rec.legs[0].expiry.toISOString()).toBe("2026-12-10T19:00:00.000Z");
  });
  it("worst case is premium; max payout = (cap-strike)*0.01*N", () => {
    const l = rec.legs[0];
    expect(l.maxPayoutUsd).toBeCloseTo((l.cap - l.strike) * 0.01 * l.contracts);
    expect(rec.totals.premiumUsd).toBeCloseTo(rec.legs.reduce((s, x) => s + x.premiumUsd, 0));
  });
  it("url round-trips", () => {
    const p = toSearchParams(rec.input);
    const r = parseInput(Object.fromEntries(p.entries()));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.input.monthlySpendUsd).toBe(10000); expect(r.input.horizonMonths).toBe(3); }
  });
  it("rejects bad input", () => {
    expect(parseInput({ spend: "-5", mix: "h100:100" }).ok).toBe(false);
    expect(parseInput({ spend: "100", mix: "" }).ok).toBe(false);
  });
});

describe("mock adapter", () => {
  it("always flags simulated and has no tx hash", async () => {
    const rec = recommend({ ...base, mix: { h100: 1 }, horizonMonths: 1 });
    const fill = await new MockTestnetAdapter().place(legToOrder(rec.legs[0]));
    expect(fill.simulated).toBe(true);
    expect(fill.txHash).toBeNull();
    expect(fill.orderId.startsWith("SIM-")).toBe(true);
    // simulated fill must equal the recommendation's own premium
    expect(fill.premiumUsd).toBeCloseTo(rec.legs[0].premiumUsd);
  });
});
