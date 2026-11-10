import { ASSUMED_ANNUAL_VOL, CONTRACT_MULTIPLIER_USD } from "./sici";

/**
 * INDICATIVE premium model for a capped call (= call spread) on SICI.
 *
 * This is NOT a quote. On Injective the premium comes from the institutional
 * liquidity provider's two-sided quote; until we can read it from testnet we
 * estimate with Black-76 on the index forward (zero rates, lognormal), priced
 * as C(strike) - C(cap), plus an assumed LP loading.
 */

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 via erf). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp((-x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** Black-76 call on a forward, zero rates. Result in index points. */
export function blackCall(F: number, K: number, vol: number, T: number): number {
  if (T <= 0 || vol <= 0) return Math.max(F - K, 0);
  const sd = vol * Math.sqrt(T);
  const d1 = (Math.log(F / K) + 0.5 * sd * sd) / sd;
  const d2 = d1 - sd;
  return F * normCdf(d1) - K * normCdf(d2);
}

/** Value of the capped call in index points (<= cap - strike). */
export function callSpreadPoints(
  forward: number,
  strike: number,
  cap: number,
  vol: number,
  T: number,
): number {
  const v = blackCall(forward, strike, vol, T) - blackCall(forward, cap, vol, T);
  return Math.min(Math.max(v, 0), cap - strike);
}

/** Assumed LP spread/loading on top of fair value. */
export const ASSUMED_LP_LOADING = 0.1;

export interface PremiumEstimate {
  /** Fair value in index points. */
  fairPoints: number;
  /** USD per contract incl. loading, rounded to a cent tick of 0.001. */
  premiumPerContractUsd: number;
}

export function estimatePremium(args: {
  spot: number;
  strike: number;
  cap: number;
  years: number;
  vol?: number;
}): PremiumEstimate {
  const vol = args.vol ?? ASSUMED_ANNUAL_VOL;
  const fair = callSpreadPoints(args.spot, args.strike, args.cap, vol, args.years);
  const raw = fair * CONTRACT_MULTIPLIER_USD * (1 + ASSUMED_LP_LOADING);
  const maxPerContract = (args.cap - args.strike) * CONTRACT_MULTIPLIER_USD;
  return {
    fairPoints: fair,
    premiumPerContractUsd: Math.min(Math.round(raw * 1000) / 1000, maxPerContract),
  };
}

/** Capped-call payoff in index points at settlement level S. */
export function payoffPoints(S: number, strike: number, cap: number): number {
  return Math.min(Math.max(S - strike, 0), cap - strike);
}
