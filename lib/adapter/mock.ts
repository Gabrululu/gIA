import { CONTRACT_MULTIPLIER_USD } from "../sici";
import type { AdapterStatus, CallOrder, Fill, OptionsAdapter } from "./types";

/**
 * MOCK testnet adapter. Nothing is sent to any chain.
 * It "fills" at the order's indicative premium (GIA's own model estimate), so the
 * simulated numbers match the recommendation screen. Every result is flagged
 * `simulated: true` and the UI must label it so.
 */
export class MockTestnetAdapter implements OptionsAdapter {
  async status(): Promise<AdapterStatus> {
    return {
      adapter: "mock-testnet",
      live: false,
      detail:
        "Simulated. Injective's Options announcement says testnet is live for whitelisted participants, but we found no public API docs for placing options orders yet.",
    };
  }

  async quote(order: CallOrder) {
    return {
      available: true,
      premiumPerContractUsd: order.indicativePremiumPerContractUsd,
      simulated: true,
    };
  }

  async place(order: CallOrder): Promise<Fill> {
    const q = await this.quote(order);
    const premiumPerContractUsd = q.premiumPerContractUsd;
    if (premiumPerContractUsd > order.maxPremiumPerContractUsd) {
      throw new Error("Simulated quote exceeds the max premium you accepted.");
    }
    const maxPayoutUsd =
      (order.cap - order.strike) * CONTRACT_MULTIPLIER_USD * order.contracts;
    return {
      orderId: `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      simulated: true,
      network: "injective-testnet",
      order,
      premiumPerContractUsd,
      premiumUsd: premiumPerContractUsd * order.contracts,
      maxPayoutUsd,
      collateralLockedByWriterUsd: maxPayoutUsd,
      txHash: null,
      note: "SIMULATED FILL. No transaction was broadcast. This is not a real position on testnet or mainnet.",
    };
  }
}
