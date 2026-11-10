import {
  assessBasisRisk,
  normalizeMix,
  type BasisAssessment,
  type ChipMix,
} from "./basis";
import { estimatePremium, payoffPoints } from "./pricing";
import {
  CONTRACT_MULTIPLIER_USD,
  SICI_FIXTURE,
  type SiciPrint,
} from "./sici";

export type Horizon = 1 | 3 | 6;
export type ProfileId = "tight" | "balanced" | "budget";

export interface HedgeInput {
  /** Monthly compute spend in USD. */
  monthlySpendUsd: number;
  mix: ChipMix;
  horizonMonths: Horizon;
  provider: string | null;
  /** Share of spend to hedge, 0..1. */
  hedgeRatio: number;
  profile: ProfileId;
}

/** strike/cap as % above the current index level. */
export const PROFILES: Record<
  ProfileId,
  { label: string; blurb: string; strikePct: number; capPct: number }
> = {
  tight: {
    label: "Tight",
    blurb: "Strike at today's level. Pays on any rise, costs the most.",
    strikePct: 0,
    capPct: 0.2,
  },
  balanced: {
    label: "Balanced",
    blurb: "You absorb the first ~5% rise; the hedge covers up to +30%.",
    strikePct: 0.05,
    capPct: 0.3,
  },
  budget: {
    label: "Budget",
    blurb: "You absorb the first ~10% rise; cheapest, covers up to +40%.",
    strikePct: 0.1,
    capPct: 0.4,
  },
};

/** One option per month so each month's bill has its own expiry (European style). */
export interface Leg {
  month: number;
  /** Expiry = 19:00 UTC daily fixing on this date. TBD against listed series. */
  expiry: Date;
  strike: number;
  cap: number;
  contracts: number;
  premiumPerContractUsd: number;
  premiumUsd: number;
  maxPayoutUsd: number;
  /** Index level at which payout equals premium. */
  breakevenIndex: number;
}

export interface Recommendation {
  input: HedgeInput;
  sici: SiciPrint;
  legs: Leg[];
  totals: {
    budgetUsd: number;
    hedgedBudgetUsd: number;
    contracts: number;
    premiumUsd: number;
    premiumPctOfBudget: number;
    maxPayoutUsd: number;
    /** Strike as % above today's index. */
    strikePctActual: number;
    capPctActual: number;
  };
  basis: BasisAssessment;
  summary: string;
  caveats: string[];
}

function addMonthsUtc1900(from: Date, months: number): Date {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate(), 19, 0, 0),
  );
  return d;
}

export function usd(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function recommend(
  input: HedgeInput,
  sici: SiciPrint = SICI_FIXTURE,
  now: Date = new Date(),
): Recommendation {
  const mix = normalizeMix(input.mix);
  const prof = PROFILES[input.profile];
  const S0 = sici.level;

  // Integer index-point strikes, like the examples in Injective's post.
  const strike = Math.round(S0 * (1 + prof.strikePct));
  const cap = Math.max(strike + 1, Math.round(S0 * (1 + prof.capPct)));

  // Each contract pays 0.01 USD per index point. The monthly bill moves by
  // spend × ΔS/S0 (beta 1 to the basket), so to offset it 1:1 per point:
  //   contracts = hedgeRatio × spend / (0.01 × S0)
  const hedgedMonthly = input.monthlySpendUsd * input.hedgeRatio;
  const contracts = Math.max(
    0,
    Math.round(hedgedMonthly / (CONTRACT_MULTIPLIER_USD * S0)),
  );

  const legs: Leg[] = [];
  for (let m = 1; m <= input.horizonMonths; m++) {
    const est = estimatePremium({ spot: S0, strike, cap, years: m / 12 });
    const premiumUsd = est.premiumPerContractUsd * contracts;
    const maxPayoutUsd = (cap - strike) * CONTRACT_MULTIPLIER_USD * contracts;
    const breakevenIndex =
      strike + est.premiumPerContractUsd / CONTRACT_MULTIPLIER_USD;
    legs.push({
      month: m,
      expiry: addMonthsUtc1900(now, m),
      strike,
      cap,
      contracts,
      premiumPerContractUsd: est.premiumPerContractUsd,
      premiumUsd,
      maxPayoutUsd,
      breakevenIndex,
    });
  }

  const budgetUsd = input.monthlySpendUsd * input.horizonMonths;
  const premiumUsd = legs.reduce((s, l) => s + l.premiumUsd, 0);
  const maxPayoutUsd = legs.reduce((s, l) => s + l.maxPayoutUsd, 0);
  const strikePctActual = strike / S0 - 1;
  const capPctActual = cap / S0 - 1;

  const basis = assessBasisRisk(mix, { provider: input.provider });

  const perLegMax = legs[0]?.maxPayoutUsd ?? 0;
  const summary =
    `If rental rates (SICI) settle above ${strike} pts (${(strikePctActual * 100).toFixed(1)}% above today's ${S0}), ` +
    `GIA pays up to ${usd(perLegMax)} per monthly option (${usd(maxPayoutUsd)} across ${legs.length} ` +
    `option${legs.length > 1 ? "s" : ""}), reaching the maximum at ${cap} pts. ` +
    `Your worst case is the premium: about ${usd(premiumUsd)}.`;

  const caveats: string[] = [
    "Premium is an indicative model estimate, not an Injective quote.",
    "Options are European: each pays once, on the 7-day-average SICI level at its expiry. They hedge the rate level at that date, not every hour of usage.",
    "Fully collateralized: the writer locks the maximum payout in USDC, so there is no counterparty margin risk on the payout. Writing is whitelist-only at launch.",
  ];
  if (sici.source === "fixture") {
    caveats.unshift(
      `SICI level is a labelled fixture (${S0} pts), not a live print.`,
    );
  }
  if (input.hedgeRatio < 1) {
    caveats.push(
      `You are hedging ${Math.round(input.hedgeRatio * 100)}% of spend; the rest stays exposed.`,
    );
  }

  return {
    input: { ...input, mix },
    sici,
    legs,
    totals: {
      budgetUsd,
      hedgedBudgetUsd: budgetUsd * input.hedgeRatio,
      contracts: contracts * legs.length,
      premiumUsd,
      premiumPctOfBudget: budgetUsd > 0 ? premiumUsd / budgetUsd : 0,
      maxPayoutUsd,
      strikePctActual,
      capPctActual,
    },
    basis,
    summary,
    caveats,
  };
}

/** What the position looks like at a given settlement level, for one leg. */
export function scenario(rec: Recommendation, settleLevel: number) {
  const leg = rec.legs[0];
  if (!leg) return { payoutUsd: 0, premiumUsd: 0, netUsd: 0 };
  const payoutUsd =
    payoffPoints(settleLevel, leg.strike, leg.cap) *
    CONTRACT_MULTIPLIER_USD *
    leg.contracts;
  return { payoutUsd, premiumUsd: leg.premiumUsd, netUsd: payoutUsd - leg.premiumUsd };
}
