import { payoffPoints } from "@/lib/pricing";
import { CONTRACT_MULTIPLIER_USD } from "@/lib/sici";
import { usd, type Leg } from "@/lib/recommend";

/** Net P&L of one monthly option at expiry (payout minus premium). Server-rendered SVG. */
export default function PayoffChart({ leg, spot }: { leg: Leg; spot: number }) {
  const W = 640, H = 260, padL = 56, padR = 16, padT = 16, padB = 36;
  const xMin = Math.floor(spot * 0.8);
  const xMax = Math.ceil(leg.cap * 1.12);
  const net = (s: number) =>
    payoffPoints(s, leg.strike, leg.cap) * CONTRACT_MULTIPLIER_USD * leg.contracts - leg.premiumUsd;
  const yMax = net(leg.cap);
  const yMin = -leg.premiumUsd;
  const pad = (yMax - yMin) * 0.12 || 1;
  const y0 = yMin - pad, y1 = yMax + pad;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB);

  const pts = [xMin, leg.strike, leg.cap, xMax].map((x) => `${sx(x)},${sy(net(x))}`).join(" ");
  const marks = [
    { x: spot, label: `now ${spot}`, top: true },
    { x: leg.strike, label: `strike ${leg.strike}`, top: false },
    { x: leg.cap, label: `cap ${leg.cap}`, top: false },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Net profit and loss of one monthly option: lose at most ${usd(leg.premiumUsd)}, gain at most ${usd(yMax)}`}>
      <line x1={padL} x2={W - padR} y1={sy(0)} y2={sy(0)} stroke="var(--line)" />
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={sx(m.x)} x2={sx(m.x)} y1={padT} y2={H - padB} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={sx(m.x)} y={m.top ? padT + 10 : H - padB + 16} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{m.label}</text>
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="var(--plum)" strokeWidth="2.5" strokeLinejoin="round" />
      <text x={padL - 8} y={sy(yMax) + 4} textAnchor="end" fontSize="11" fill="var(--ok)">+{usd(yMax)}</text>
      <text x={padL - 8} y={sy(yMin) + 4} textAnchor="end" fontSize="11" fill="var(--bad)">−{usd(leg.premiumUsd)}</text>
      <text x={padL - 8} y={sy(0) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">$0</text>
      <text x={(padL + W - padR) / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">SICI level at expiry (index points)</text>
    </svg>
  );
}
