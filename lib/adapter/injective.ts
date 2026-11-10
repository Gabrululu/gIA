import type { AdapterStatus, CallOrder, Fill, OptionsAdapter } from "./types";

/**
 * Real capped-call execution remains unavailable until deployment, schema,
 * listed series and quotes are verified. See docs/validation/README.md.
 * Public Binary Options messages are a different product.
 */
export class InjectiveTestnetOptionsAdapter implements OptionsAdapter {
  async status(): Promise<AdapterStatus> {
    return {
      adapter: "injective-testnet",
      live: false,
      detail: "Unavailable: the Options testnet interface, listed series and quotes have not been verified for gIA.",
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
