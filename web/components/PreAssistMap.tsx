import type { Goal } from "@/lib/data";

/**
 * Spielfeld mit den Startpunkten aller Pre-Assists (Punkte) und – dünn – dem Weg des Passes.
 * Zeigt, aus welchen Zonen die Angriffe vorbereitet werden.
 */
export default function PreAssistMap({ goals, label }: { goals: Goal[]; label: string }) {
  const pre = goals.filter((g) => g.pre);
  const thirds = [0, 0, 0];
  for (const g of pre) thirds[Math.min(2, Math.floor(g.pre!.start[0] / 40))]++;
  const pct = (n: number) => (pre.length ? Math.round((n / pre.length) * 100) : 0);

  return (
    <figure className="pa-map">
      <svg viewBox="-2 -2 124 84" className="pitch" role="img" aria-label={label}>
        <g className="pitch-markings">
          <rect x={0} y={0} width={120} height={80} />
          <line x1={60} y1={0} x2={60} y2={80} />
          <circle cx={60} cy={40} r={10} />
          <rect x={102} y={18} width={18} height={44} />
          <rect x={114} y={30} width={6} height={20} />
          <rect x={0} y={18} width={18} height={44} />
          <rect x={0} y={30} width={6} height={20} />
        </g>
        <g className="pa-thirds">
          <line x1={40} y1={0} x2={40} y2={80} />
          <line x1={80} y1={0} x2={80} y2={80} />
        </g>
        {pre.map((g, i) => (
          <g key={g.id} className="pa-shot" style={{ "--seq": i % 12 } as React.CSSProperties}>
            <line x1={g.pre!.start[0]} y1={g.pre!.start[1]} x2={g.pre!.end[0]} y2={g.pre!.end[1]} />
            <circle cx={g.pre!.start[0]} cy={g.pre!.start[1]} r={1.3} />
          </g>
        ))}
      </svg>
      <figcaption className="pa-thirds-legend">
        <span>
          <b>{pct(thirds[0])} %</b> eigenes Drittel
        </span>
        <span>
          <b>{pct(thirds[1])} %</b> Mittelfeld
        </span>
        <span>
          <b>{pct(thirds[2])} %</b> Angriffsdrittel
        </span>
      </figcaption>
    </figure>
  );
}
