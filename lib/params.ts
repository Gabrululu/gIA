import type { ChipMix } from "./basis";
import { MIX_KEYS, type MixKey } from "./sici";
import type { HedgeInput, Horizon, ProfileId } from "./recommend";

/**
 * The URL is the shareable state: /recommendation?spend=10000&mix=h100:60,h200:40&h=3
 * No server storage, no accounts, no keys.
 */
export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function encodeMix(mix: ChipMix): string {
  return MIX_KEYS.filter((k) => (mix[k] ?? 0) > 0)
    .map((k) => `${k}:${Math.round((mix[k] ?? 0) * 1000) / 10}`)
    .join(",");
}

export function decodeMix(s: string | undefined): ChipMix {
  const out: ChipMix = {};
  if (!s) return out;
  for (const part of s.split(",")) {
    const [k, v] = part.split(":");
    const n = Number(v);
    if ((MIX_KEYS as readonly string[]).includes(k) && Number.isFinite(n) && n > 0) {
      out[k as MixKey] = n;
    }
  }
  return out;
}

export function toSearchParams(input: HedgeInput): URLSearchParams {
  const p = new URLSearchParams();
  p.set("spend", String(input.monthlySpendUsd));
  p.set("mix", encodeMix(input.mix));
  p.set("h", String(input.horizonMonths));
  p.set("profile", input.profile);
  p.set("hr", String(Math.round(input.hedgeRatio * 100)));
  if (input.provider) p.set("prov", input.provider);
  return p;
}

export type ParseResult =
  | { ok: true; input: HedgeInput }
  | { ok: false; error: string };

export function parseInput(raw: RawParams): ParseResult {
  const spend = Number(first(raw.spend));
  if (!Number.isFinite(spend) || spend <= 0 || spend > 1e9) {
    return { ok: false, error: "Monthly compute spend must be a positive number." };
  }
  const mix = decodeMix(first(raw.mix));
  if (Object.keys(mix).length === 0) {
    return { ok: false, error: "Pick at least one chip with a share above 0%." };
  }
  const h = Number(first(raw.h));
  const horizon: Horizon = h === 1 || h === 3 || h === 6 ? h : 3;
  const profileRaw = first(raw.profile);
  const profile: ProfileId =
    profileRaw === "tight" || profileRaw === "budget" ? profileRaw : "balanced";
  const hrRaw = Number(first(raw.hr));
  const hedgeRatio =
    Number.isFinite(hrRaw) && hrRaw > 0 && hrRaw <= 100 ? hrRaw / 100 : 1;
  const prov = first(raw.prov)?.slice(0, 60).trim() || null;
  return {
    ok: true,
    input: {
      monthlySpendUsd: spend,
      mix,
      horizonMonths: horizon,
      provider: prov,
      hedgeRatio,
      profile,
    },
  };
}
