import type { Leg } from "./recommend";

/**
 * ROLLOVER AGENT — design only, STUB in v1 (nothing is signed or sent).
 *
 * Problem: options expire; coverage should be continuous without asking the
 * team to sign every month.
 *
 * Design: Cosmos AuthZ (MsgGrant / MsgExec / MsgRevoke).
 *   Docs: https://docs.injective.network/developers-native/examples/authz
 *  1. The user (granter) grants a GIA agent key (grantee) permission for ONLY the
 *     message type(s) needed to buy the next call, with an expiration.
 *     Grants are per message type, one MsgGrant each.
 *  2. Before expiry (e.g. 3 days), the agent wraps a buy in MsgExec and broadcasts
 *     it from the grantee key on behalf of the granter.
 *  3. The user can MsgRevoke at any time.
 *
 * Open design risks (to resolve before building):
 *  - The Options message type URLs are not published in the docs we read.
 *  - The docs show per-message-type grants. A generic grant does not by itself
 *    cap how much USDC can be spent per roll, so the safe pattern is a dedicated
 *    sub-account funded only with the rolling budget, plus a short grant expiry.
 *  - The agent key is a hot key GIA would operate: custody/ops model needs a decision.
 *  - Rolling at a worse market price is a real cost: the policy needs a max premium.
 */

export interface RolloverPolicy {
  /** User's Injective address (inj1...). Filled after wallet connect (later). */
  granter: string | null;
  /** GIA agent address. */
  grantee: string | null;
  /** Message type URLs to grant. TODO: Options buy message, once published. */
  messageTypes: string[];
  /** Roll this many days before expiry. */
  rollBeforeExpiryDays: number;
  /** Refuse to roll if premium per contract exceeds this (USD). */
  maxPremiumPerContractUsd: number;
  /** Grant expiry, ISO. */
  grantExpiresAt: string;
}

export function planRolloverPolicy(
  legs: Leg[],
  opts: { maxPremiumMultiple?: number; rollBeforeExpiryDays?: number } = {},
): RolloverPolicy {
  const last = legs[legs.length - 1];
  const worstPremium = Math.max(0, ...legs.map((l) => l.premiumPerContractUsd));
  return {
    granter: null,
    grantee: null,
    messageTypes: [], // TODO(options-api)
    rollBeforeExpiryDays: opts.rollBeforeExpiryDays ?? 3,
    maxPremiumPerContractUsd:
      Math.round(worstPremium * (opts.maxPremiumMultiple ?? 1.25) * 1000) / 1000,
    grantExpiresAt: last ? last.expiry.toISOString() : new Date().toISOString(),
  };
}

/** STUB: would broadcast MsgGrant + later MsgExec. Intentionally does nothing. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function enableAutoRoll(_policy: RolloverPolicy): Promise<{ enabled: false; reason: string }> {
  return {
    enabled: false,
    reason: "Auto-roll is a v1 stub: needs the Options message types and a decision on the agent key model.",
  };
}
