import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/hedge/route";

const request = (body: unknown) => new Request("http://localhost/api/hedge", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv("GIA_ADAPTER", "mock");
  vi.stubEnv("GIA_SICI_MODE", "live");
  vi.stubEnv("GIA_SICI_NETWORK", "testnet");
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({
    providerState: [{ provider_info: { provider: "InjectiveLabs" }, provider_price_states: [
      { symbol: "SICI/USDC", state: { price: "107.837809", timestamp: String(Math.floor(Date.now() / 1000)) } },
    ] }],
  })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("prototype execution API", () => {
  it("recomputes a shared recommendation and returns one simulated fill per month", async () => {
    const response = await POST(request({ query: "spend=10000&mix=h100:100&h=3&profile=balanced&hr=100", strike: 1, premiumUsd: 0 }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status.live).toBe(false);
    expect(data.sici).toMatchObject({ source: "live", level: 107.837809, network: "testnet" });
    expect(data.fills).toHaveLength(3);
    for (const fill of data.fills) {
      expect(fill.simulated).toBe(true);
      expect(fill.txHash).toBeNull();
      expect(fill.order.strike).toBe(Math.round(data.sici.level * 1.05));
      expect(fill.premiumUsd).toBeGreaterThan(0);
    }
  });
  it.each([null, {}, { query: "spend=-1&mix=h100:100" }])("rejects invalid inputs: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new Request("http://localhost/api/hedge", { method: "POST", body: "{" }))).status).toBe(400);
  });
});
