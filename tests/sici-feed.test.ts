import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/sici/route";
import { getSiciPrint, parseSiciOracle, SICI_FEEDS, SICI_MAX_AGE_MS } from "@/lib/sici-feed";

const now = Date.parse("2026-11-10T10:00:00Z");
function payload(price: unknown = "107.837809000000000000", timestamp: unknown = String(now / 1000)) {
  return { providerState: [{ provider_info: { provider: "InjectiveLabs" },
    provider_price_states: [{ symbol: "SICI/USDC", state: { price, timestamp } }] }] };
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("SICI oracle parsing", () => {
  it("preserves decimal index points and the actual source timestamp", () => {
    expect(parseSiciOracle(payload(), "testnet", now)).toMatchObject({
      level: 107.837809, asOf: "2026-11-10T10:00:00.000Z", source: "live", network: "testnet",
    });
  });
  it.each(["0", "-1", "NaN", "Infinity", "1e4", " ", true, null, 107])("rejects invalid price %j", price => {
    expect(parseSiciOracle(payload(price), "testnet", now)).toBeNull();
  });
  it.each([String((now - SICI_MAX_AGE_MS - 1000) / 1000), String((now + 61_000) / 1000), "NaN", "1e20", null])("rejects stale/future/invalid timestamp %j", timestamp => {
    expect(parseSiciOracle(payload(undefined, timestamp), "testnet", now)).toBeNull();
  });
  it("only accepts the exact provider and symbol", () => {
    const data = payload();
    data.providerState[0].provider_info.provider = "UnverifiedProvider";
    expect(parseSiciOracle(data, "testnet", now)).toBeNull();
    data.providerState[0].provider_info.provider = "InjectiveLabs";
    data.providerState[0].provider_price_states[0].symbol = "H100/USDC";
    expect(parseSiciOracle(data, "testnet", now)).toBeNull();
  });
  it.each([null, [], {}, { providerState: [null, {}] }])("handles malformed payload %j", data => {
    expect(parseSiciOracle(data, "testnet", now)).toBeNull();
  });
});

describe("live reference and fallback", () => {
  it("defaults to testnet with uncached fetch and a timeout", async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    vi.stubEnv("GIA_SICI_MODE", "live"); vi.stubEnv("GIA_SICI_NETWORK", "testnet");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload())); vi.stubGlobal("fetch", fetchMock);
    expect(await getSiciPrint()).toMatchObject({ source: "live", level: 107.837809 });
    expect(fetchMock).toHaveBeenCalledWith(SICI_FEEDS.testnet, expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  });
  it("supports explicitly selected mainnet for read-only data", async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    vi.stubEnv("GIA_SICI_MODE", "live"); vi.stubEnv("GIA_SICI_NETWORK", "mainnet");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload())); vi.stubGlobal("fetch", fetchMock);
    expect(await getSiciPrint()).toMatchObject({ source: "live", network: "mainnet" });
    expect(fetchMock.mock.calls[0][0]).toBe(SICI_FEEDS.mainnet);
  });
  it("fixture mode makes no network request", async () => {
    vi.stubEnv("GIA_SICI_MODE", "fixture"); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await getSiciPrint()).toMatchObject({ source: "fixture", level: 113, asOf: null, fallbackReason: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["transport", "timeout", "http", "json", "stale"])("labels fallback after %s failure", async kind => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    vi.stubEnv("GIA_SICI_MODE", "live"); vi.stubEnv("GIA_SICI_NETWORK", "testnet");
    const fetchMock = vi.fn();
    if (kind === "transport" || kind === "timeout") fetchMock.mockRejectedValue(new DOMException("failed", kind === "timeout" ? "TimeoutError" : "NetworkError"));
    if (kind === "http") fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));
    if (kind === "json") fetchMock.mockResolvedValue(new Response("{invalid"));
    if (kind === "stale") fetchMock.mockResolvedValue(Response.json(payload(undefined, String((now - SICI_MAX_AGE_MS - 1000) / 1000))));
    vi.stubGlobal("fetch", fetchMock);
    expect(await getSiciPrint()).toMatchObject({ source: "fixture", level: 113, asOf: null, fallbackReason: "unavailable" });
  });
  it("does not fetch arbitrary endpoints from invalid configuration", async () => {
    vi.stubEnv("GIA_SICI_MODE", "live"); vi.stubEnv("GIA_SICI_NETWORK", "https://untrusted.example");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await getSiciPrint()).source).toBe("fixture"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("exposes provenance and disables response caching on the data API", async () => {
    vi.stubEnv("GIA_SICI_MODE", "fixture");
    const response = await GET(); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ source: "fixture", fallbackReason: "disabled" });
  });
});
