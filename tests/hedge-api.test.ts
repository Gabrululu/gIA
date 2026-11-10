import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/hedge/route";

const request = (body: unknown) => new Request("http://localhost/api/hedge", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("prototype execution API", () => {
  it("recomputes a shared recommendation and returns one simulated fill per month", async () => {
    const response = await POST(request({ query: "spend=10000&mix=h100:100&h=3&profile=balanced&hr=100", strike: 1, premiumUsd: 0 }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status.live).toBe(false);
    expect(data.fills).toHaveLength(3);
    for (const fill of data.fills) {
      expect(fill.simulated).toBe(true);
      expect(fill.txHash).toBeNull();
      expect(fill.order.strike).toBeGreaterThan(113);
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
