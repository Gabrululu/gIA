import { NextResponse } from "next/server";
import { getSiciPrint } from "@/lib/sici-feed";

export async function GET() {
  const sici = await getSiciPrint();
  return NextResponse.json(sici, { headers: { "Cache-Control": "no-store" } });
}
