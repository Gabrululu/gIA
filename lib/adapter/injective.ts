import type { AdapterStatus, CallOrder, Fill, OptionsAdapter } from "./types";

/**
 * REAL Injective Options adapter — NOT IMPLEMENTED in v1.
 *
 * Why: the pages we reviewed (Injective docs index, last updated 2026-03-31)
 * document the OLD "Binary Options Markets" (0–1 event markets) and the
 * exchange module, but not the Oct-2026 Options primitive (fully collateralized,
 * cash-settled European calls/puts on SICI, US500, US Tech, XAU, XAG, WTI).
 * Do NOT wire this to the binary options messages: it is a different product.
 *
 * TODO(options-api): once the Options message/query types are published, implement:
 *  - quote(): query the series (market SICI, strike, cap, expiry) and the LP's ask.
 *  - place(): build the buy message and broadcast it. Sign in the USER's wallet
 *    (Keplr / Leap / MetaMask via @injectivelabs/wallet-*); never custody keys.
 *    Pattern: MsgBroadcaster from @injectivelabs/sdk-ts, Network.Testnet.
 *  - USDC: premium is paid in native testnet USDC (see TESTNET.usdcEvm), faucet
 *    at https://faucet.circle.com/ ; INJ for gas at https://testnet.faucet.injective.network/
 *
 * Where to look:
 *  - Announcement: https://injective.com/blog/injective-options
 *  - SDK:          https://github.com/InjectiveLabs/injective-ts/
 *  - Docs index:   https://docs.injective.network/llms.txt  (check for an Options section)
 *  - Agents:       https://docs.injective.network/developers-ai/mcp
 *  - Writer access is whitelist-only at launch; ask Injective (Discord / Hacker House).
 */
export class InjectiveTestnetOptionsAdapter implements OptionsAdapter {
  async status(): Promise<AdapterStatus> {
    return {
      adapter: "injective-testnet",
      live: false,
      detail: "Not implemented: Options testnet API is not publicly documented yet.",
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async quote(_order: CallOrder): Promise<never> {
    throw new Error("InjectiveTestnetOptionsAdapter.quote is not implemented (see TODO).");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async place(_order: CallOrder): Promise<Fill> {
    throw new Error("InjectiveTestnetOptionsAdapter.place is not implemented (see TODO).");
  }
}
