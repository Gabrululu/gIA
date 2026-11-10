/**
 * SICI — Super Intelligence Compute Index (LO:TECH, listed on Injective).
 *
 * Sources (official):
 *  - https://injective.com/blog/super-intelligence-compute-index
 *  - https://lo.tech/news/compute-now-has-a-reference-price
 *
 * What it is: a physical GPU-RENTAL index (USD per GPU-hour from compute
 * marketplaces), NOT an equity index. Five Nvidia chips at FIXED weights; each
 * chip rebased to 100 at the 22 Jul 2026 daily fixing. The published level is a
 * trailing 7-day average of the hourly basket, struck hourly (UTC), with the
 * 19:00 UTC print as the daily fixing.
 */

export type ChipId = "h100" | "b200" | "h200" | "a100" | "rtx4090";
/** "other" = anything the renter uses that SICI does not track (L40S, MI300X, ...). */
export type MixKey = ChipId | "other";

export interface ChipInfo {
  id: ChipId;
  label: string;
  /** Fixed SICI weight, sums to 1. */
  weight: number;
}

export const SICI_CHIPS: readonly ChipInfo[] = [
  { id: "h100", label: "Nvidia H100 SXM 80GB", weight: 0.4 },
  { id: "b200", label: "Nvidia B200", weight: 0.25 },
  { id: "h200", label: "Nvidia H200", weight: 0.15 },
  { id: "a100", label: "Nvidia A100 SXM 80GB", weight: 0.1 },
  { id: "rtx4090", label: "Nvidia GeForce RTX 4090", weight: 0.1 },
] as const;

export const MIX_KEYS: readonly MixKey[] = [
  "h100",
  "b200",
  "h200",
  "a100",
  "rtx4090",
  "other",
];

export const MIX_LABELS: Record<MixKey, string> = {
  h100: "H100 SXM 80GB",
  b200: "B200",
  h200: "H200",
  a100: "A100 SXM 80GB",
  rtx4090: "RTX 4090",
  other: "Other chips (not in SICI)",
};

export const SICI_WEIGHTS: Record<ChipId, number> = Object.fromEntries(
  SICI_CHIPS.map((c) => [c.id, c.weight]),
) as Record<ChipId, number>;

export const SICI_METHODOLOGY = {
  baseDate: "2026-07-22",
  baseLevel: 100,
  averaging: "trailing 7-day average of the hourly basket",
  strike: "hourly, UTC",
  dailyFixingUtc: "19:00",
  provider: "LO:TECH",
} as const;

/** One contract pays 0.01 × (index points) — see the Injective Options post. */
export const CONTRACT_MULTIPLIER_USD = 0.01;

export interface SiciPrint {
  /** Index level in points. */
  level: number;
  /** ISO timestamp the level refers to, when known. */
  asOf: string | null;
  /** "fixture" = hand-set placeholder. "live" = fetched from a real feed. */
  source: "fixture" | "live";
  /** Human-readable provenance, shown in the UI. */
  note: string;
}

/**
 * FIXTURE — NOT A LIVE PRINT.
 *
 * 113 is the illustrative level used in Injective's own worked example in the
 * Options launch post (27 Oct 2026). It is a placeholder so the prototype is
 * deterministic; the real level moves hourly.
 */
export const SICI_FIXTURE: SiciPrint = {
  level: 113,
  asOf: null,
  source: "fixture",
  note: "Fixture: 113 pts is the example level from Injective's Options launch post, not a live LO:TECH print.",
};

/**
 * Annualised volatility ASSUMPTION used only for the indicative premium model.
 * No SICI vol history was available to us — replace with real realised/implied vol.
 */
export const ASSUMED_ANNUAL_VOL = 0.45;

/**
 * HOOK to replace the fixture with a live print.
 *
 * TODO(live-feed): options for a real print, in order of preference:
 *  1. Query the SICI market on Injective testnet/mainnet (oracle price of the
 *     SICI perpetual market) via @injectivelabs/sdk-ts (IndexerGrpcDerivativesApi
 *     / ChainGrpcOracleApi). Market ticker/ID is not documented in the pages we
 *     read — look it up in the Injective Hub / indexer markets list.
 *  2. Ask LO:TECH for the feed: data@lo.tech (see their SICI post).
 * Must return the 7-day-average level, i.e. the settlement-relevant number.
 */
export async function fetchLiveSici(): Promise<SiciPrint | null> {
  return null;
}

/** Live print when available, otherwise the clearly-labelled fixture. */
export async function getSiciPrint(): Promise<SiciPrint> {
  try {
    const live = await fetchLiveSici();
    if (live) return live;
  } catch {
    // fall through to fixture
  }
  return SICI_FIXTURE;
}
