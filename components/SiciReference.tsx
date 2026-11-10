import type { SiciPrint } from "@/lib/sici";

/** Shared provenance for recommendation and execution, including explicit fallback. */
export default function SiciReference({ sici }: { sici: SiciPrint }) {
  return <div className={`rounded-lg border p-4 text-sm ${sici.source === "live" ? "border-line" : "border-warn/50 bg-warn/5"}`}>
    <p className="font-medium">SICI {sici.level.toLocaleString("en-US", { maximumFractionDigits: 6 })} pts · {sici.source === "live" ? `Live oracle (${sici.network})` : "EXAMPLE DATA · not live"}</p>
    {sici.asOf && <p className="mt-1 text-xs text-muted-foreground">Observed: <time dateTime={sici.asOf}>{sici.asOf.replace("T", " ").replace(".000Z", " UTC")}</time></p>}
    <p className="mt-1 text-xs text-muted-foreground">{sici.note}</p>
    <p className="mt-1 text-xs text-muted-foreground">Premiums and fills remain simulated. Listed option series and settlement rules are not yet verified.</p>
  </div>;
}
