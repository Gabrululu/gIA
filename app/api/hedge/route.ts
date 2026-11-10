import { NextResponse } from "next/server";
import { getAdapter, legToOrder } from "@/lib/adapter";
import { parseInput } from "@/lib/params";
import { recommend } from "@/lib/recommend";
import { getSiciPrint } from "@/lib/sici-feed";

/**
 * POST { query: "spend=...&mix=...&h=..." }
 * The server RECOMPUTES the recommendation from the inputs; it never trusts
 * strike/premium numbers sent by the browser. No keys are handled here.
 */
export async function POST(req: Request) {
  let query = "";
  try {
    const body: unknown = await req.json();
    query = body && typeof body === "object" && "query" in body && typeof body.query === "string" ? body.query : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = parseInput(Object.fromEntries(new URLSearchParams(query).entries()));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const sici = await getSiciPrint();
  const rec = recommend(parsed.input, sici);
  const adapter = getAdapter();
  try {
    const status = await adapter.status();
    const fills = [];
    for (const leg of rec.legs) fills.push(await adapter.place(legToOrder(leg)));
    return NextResponse.json({ status, fills, sici }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Execution failed." },
      { status: 501 },
    );
  }
}
