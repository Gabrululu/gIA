import { InjectiveTestnetOptionsAdapter } from "./injective";
import { MockTestnetAdapter } from "./mock";
import type { OptionsAdapter } from "./types";

export * from "./types";

/**
 * Picks the adapter. Default is the mock. GIA_ADAPTER=injective selects the
 * (not yet implemented) real adapter, which will throw until the TODOs are done.
 */
export function getAdapter(): OptionsAdapter {
  if (process.env.GIA_ADAPTER === "injective") {
    return new InjectiveTestnetOptionsAdapter();
  }
  return new MockTestnetAdapter();
}
