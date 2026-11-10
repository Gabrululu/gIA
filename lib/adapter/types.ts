import type { Leg } from "../recommend";

/** Injective testnet only. v1 never touches mainnet and never holds user keys. */
export const TESTNET = {
  cosmosChainId: "injective-888",
  evmChainId: 1439,
  evmRpc: "https://k8s.testnet.json-rpc.injective.network/",
  explorerNative: "https://testnet.explorer.injective.network/",
  explorerEvm: "https://testnet.blockscout.injective.network/",
  /** Testnet USDC (MTS) — from docs.injective.network/developers-defi/usdc-stablecoin */
  usdcEvm: "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d",
  faucets: {
    inj: "https://testnet.faucet.injective.network/",
    usdc: "https://faucet.circle.com/",
  },
} as const;

/** One European capped call on SICI, cash-settled in USDC. */
export interface CallOrder {
  market: "SICI";
  type: "capped-call";
  strike: number;
  cap: number;
  /** ISO timestamp of the expiry (19:00 UTC fixing). */
  expiry: string;
  contracts: number;
  /** GIA's model estimate (USD per contract). Indicative only, not an LP quote. */
  indicativePremiumPerContractUsd: number;
  /** Max premium the user accepts, USD per contract. */
  maxPremiumPerContractUsd: number;
}

export function legToOrder(leg: Leg, slippage = 0.15): CallOrder {
  return {
    market: "SICI",
    type: "capped-call",
    strike: leg.strike,
    cap: leg.cap,
    expiry: leg.expiry.toISOString(),
    contracts: leg.contracts,
    indicativePremiumPerContractUsd: leg.premiumPerContractUsd,
    maxPremiumPerContractUsd:
      Math.round(leg.premiumPerContractUsd * (1 + slippage) * 1000) / 1000,
  };
}

export interface AdapterStatus {
  adapter: "mock-testnet" | "injective-testnet";
  /** True when orders really go to a chain. */
  live: boolean;
  /** Why the live path is (not) available. */
  detail: string;
}

export interface Fill {
  orderId: string;
  /** Always true for the mock. A simulated fill is NOT an on-chain trade. */
  simulated: boolean;
  network: "injective-testnet";
  order: CallOrder;
  premiumPerContractUsd: number;
  premiumUsd: number;
  maxPayoutUsd: number;
  collateralLockedByWriterUsd: number;
  txHash: string | null;
  note: string;
}

export interface OptionsAdapter {
  status(): Promise<AdapterStatus>;
  /** Look up whether testnet has a writer/LP quote for this series. */
  quote(order: CallOrder): Promise<{ available: boolean; premiumPerContractUsd: number | null; simulated: boolean }>;
  place(order: CallOrder): Promise<Fill>;
}
