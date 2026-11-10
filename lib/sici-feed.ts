import { SICI_FIXTURE, type SiciPrint } from "./sici";

// Server module. Only fixed public endpoints; no browser-supplied URL is fetched.
export const SICI_FEEDS = {
  testnet: "https://testnet.sentry.lcd.injective.network/injective/oracle/v1beta1/provider_prices",
  mainnet: "https://sentry.lcd.injective.network/injective/oracle/v1beta1/provider_prices",
} as const;
export const SICI_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 60_000;
const TIMEOUT_MS = 4_000;

type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue => typeof v === "object" && v !== null && !Array.isArray(v);

/** provider_prices is already decimal index points, not the scaled market mark_price. */
export function parseSiciOracle(payload: unknown, network: keyof typeof SICI_FEEDS, now = Date.now()): SiciPrint | null {
  if (!record(payload) || !Array.isArray(payload.providerState)) return null;
  const observations: SiciPrint[] = [];
  for (const provider of payload.providerState) {
    if (!record(provider) || !record(provider.provider_info) ||
        provider.provider_info.provider !== "InjectiveLabs" || !Array.isArray(provider.provider_price_states)) continue;
    for (const item of provider.provider_price_states) {
      if (!record(item) || item.symbol !== "SICI/USDC" || !record(item.state)) continue;
      const { price, timestamp } = item.state;
      // Reject coercible values such as booleans, exponents and whitespace.
      if (typeof price !== "string" || !/^\d+(\.\d+)?$/.test(price) ||
          typeof timestamp !== "string" || !/^\d+$/.test(timestamp)) continue;
      const level = Number(price);
      const milliseconds = Number(timestamp) * 1000;
      if (!Number.isFinite(level) || level <= 0 || !Number.isSafeInteger(milliseconds) ||
          now - milliseconds > SICI_MAX_AGE_MS || milliseconds - now > FUTURE_TOLERANCE_MS) continue;
      observations.push({
        level, asOf: new Date(milliseconds).toISOString(), source: "live", network,
        note: `Injective ${network} oracle · InjectiveLabs / SICI/USDC. This observation is not a guaranteed options settlement fixing.`,
      });
    }
  }
  // Prefer the freshest valid observation if an upstream response contains duplicates.
  return observations.sort((a, b) => Date.parse(b.asOf!) - Date.parse(a.asOf!))[0] ?? null;
}

export async function fetchLiveSici(): Promise<SiciPrint | null> {
  const network = process.env.GIA_SICI_NETWORK ?? "testnet";
  if (network !== "testnet" && network !== "mainnet") return null;
  const response = await fetch(SICI_FEEDS[network], {
    cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  return parseSiciOracle(await response.json(), network);
}

/** Fresh live reference by default. Never pass an old/invalid observation off as live. */
export async function getSiciPrint(): Promise<SiciPrint> {
  if (process.env.GIA_SICI_MODE === "fixture") {
    return { ...SICI_FIXTURE, fallbackReason: "disabled", note: "Live feed disabled in configuration. " + SICI_FIXTURE.note };
  }
  if (!process.env.GIA_SICI_MODE || process.env.GIA_SICI_MODE === "live") {
    try {
      const live = await fetchLiveSici();
      if (live) return live;
    } catch {
      // Timeout, transport failure, and malformed JSON all produce a labelled fixture.
    }
  }
  return {
    ...SICI_FIXTURE, fallbackReason: "unavailable",
    note: "Live SICI feed unavailable or invalid (maximum age: 2 hours). Using example data, not a live price.",
  };
}
