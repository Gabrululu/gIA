import { MIX_KEYS, MIX_LABELS, SICI_WEIGHTS, type MixKey } from "./sici";

/** Fractions per chip, summing to 1. Keys not present count as 0. */
export type ChipMix = Partial<Record<MixKey, number>>;

export type BasisSeverity = "low" | "moderate" | "high";

export interface StressRow {
  chip: MixKey;
  label: string;
  /** Assumed rental-rate shock for this chip only, e.g. 0.2 = +20%. */
  shock: number;
  /** % change in the renter's bill if only this chip moves. */
  billChange: number;
  /** % change in SICI if only this chip moves. */
  siciChange: number;
  /** Share of the bill increase the hedge would cover (0..1, can exceed 1). */
  hedgeRatio: number;
}

export interface BasisAssessment {
  severity: BasisSeverity;
  /** Total-variation distance between user mix and SICI weights, 0..1. */
  divergence: number;
  /** Share of the renter's spend that SICI actually tracks (1 - "other"). */
  trackedShare: number;
  /** Overlap = Σ min(user_i, sici_i). 1 = identical mix. */
  overlap: number;
  matchesSici: boolean;
  headline: string;
  reasons: string[];
  stress: StressRow[];
}

const EPS = 1e-9;

export function normalizeMix(raw: ChipMix): ChipMix {
  const total = MIX_KEYS.reduce((s, k) => s + Math.max(0, raw[k] ?? 0), 0);
  if (total <= EPS) return {};
  const out: ChipMix = {};
  for (const k of MIX_KEYS) {
    const v = Math.max(0, raw[k] ?? 0) / total;
    if (v > EPS) out[k] = v;
  }
  return out;
}

export function siciMatchMix(): ChipMix {
  return { ...SICI_WEIGHTS };
}

export function assessBasisRisk(
  rawMix: ChipMix,
  opts: { provider?: string | null } = {},
): BasisAssessment {
  const mix = normalizeMix(rawMix);
  const keys = MIX_KEYS;

  // Total-variation distance over the 5 SICI chips + "other" (SICI weight 0).
  let l1 = 0;
  let overlap = 0;
  for (const k of keys) {
    const u = mix[k] ?? 0;
    const w = k === "other" ? 0 : SICI_WEIGHTS[k];
    l1 += Math.abs(u - w);
    overlap += Math.min(u, w);
  }
  const divergence = l1 / 2;
  const trackedShare = 1 - (mix.other ?? 0);
  const matchesSici = divergence < 0.02;

  const severity: BasisSeverity =
    divergence < 0.1 ? "low" : divergence < 0.3 ? "moderate" : "high";

  const reasons: string[] = [];
  const dominantKey = keys.find((k) => k !== "other" && (mix[k] ?? 0) >= 0.6);
  if (dominantKey) {
    reasons.push(
      `Your bill is concentrated in ${MIX_LABELS[dominantKey]} (${Math.round(
        (mix[dominantKey] ?? 0) * 100,
      )}%), while SICI spreads risk across five chips (largest weight: H100 at 40%).`,
    );
  }
  if ((mix.other ?? 0) > EPS) {
    reasons.push(
      `${Math.round((mix.other ?? 0) * 100)}% of your spend is on chips SICI does not track at all, so that part is unhedged.`,
    );
  }
  const missing = (Object.keys(SICI_WEIGHTS) as (keyof typeof SICI_WEIGHTS)[])
    .filter((k) => (mix[k] ?? 0) < EPS && SICI_WEIGHTS[k] >= 0.15)
    .map((k) => MIX_LABELS[k]);
  if (missing.length) {
    reasons.push(
      `SICI gives weight to chips you do not rent (${missing.join(", ")}); their price moves will make the hedge pay without you paying more.`,
    );
  }
  reasons.push(
    "SICI is a trailing 7-day average of marketplace-pooled prices (on-demand and spot). Your provider's list price can move at different times and by different amounts.",
  );
  if (opts.provider && opts.provider.trim()) {
    reasons.push(
      `Provider-specific pricing (${opts.provider.trim()}) is not what SICI measures; provider-level moves can diverge from the pooled index.`,
    );
  }

  const stress: StressRow[] = keys.map((chip) => {
    const shock = 0.2;
    const u = mix[chip] ?? 0;
    const w = chip === "other" ? 0 : SICI_WEIGHTS[chip];
    const billChange = u * shock;
    const siciChange = w * shock;
    return {
      chip,
      label: MIX_LABELS[chip],
      shock,
      billChange,
      siciChange,
      hedgeRatio: billChange > EPS ? siciChange / billChange : siciChange > EPS ? Infinity : 1,
    };
  });

  const headline = matchesSici
    ? "Your chip mix is close to SICI's weights. Basis risk is still not zero."
    : severity === "low"
      ? "Low basis risk: your mix is close to the SICI basket."
      : severity === "moderate"
        ? "Moderate basis risk: your chip mix differs from the SICI basket."
        : "High basis risk: your chip mix is far from the SICI basket. Treat this as a partial hedge.";

  return {
    severity,
    divergence,
    trackedShare,
    overlap,
    matchesSici,
    headline,
    reasons,
    stress,
  };
}
