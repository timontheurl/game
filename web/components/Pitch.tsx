import type { Goal, Point } from "@/lib/data";
import { arrowHead, shorten } from "@/lib/geom";

// StatsBomb-Koordinaten: x 0–120 (Angriff nach rechts), y 0–80.
// Die Linien zeichnen sich nacheinander, sobald die Grafik ins Bild scrollt (--seq = Reihenfolge).

function Arrow({ from, to, cls, seq }: { from: Point; to: Point; cls: string; seq: number }) {
  const end = shorten(from, to, 2.4);
  return (
    <g className={`pitch-arrow ${cls}`} style={{ "--seq": seq } as React.CSSProperties}>
      <line x1={from[0]} y1={from[1]} x2={end[0]} y2={end[1]} pathLength={1} className="pitch-line" />
      <polygon points={arrowHead(from, to, 3, 2.6)} className="pitch-head" />
    </g>
  );
}

function Carry({ from, to, seq }: { from: Point; to: Point; seq: number }) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      className="pitch-carry"
      style={{ "--seq": seq } as React.CSSProperties}
    />
  );
}

function Dot({ at, label, cls, seq }: { at: Point; label: string; cls: string; seq: number }) {
  return (
    <g className={`pitch-dot ${cls}`} style={{ "--seq": seq } as React.CSSProperties}>
      <circle cx={at[0]} cy={at[1]} r={2.3} />
      <text x={at[0]} y={at[1] + 0.95} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

export default function Pitch({ goal }: { goal: Goal }) {
  const goalTarget: Point = goal.shot.end ?? [120, 40];
  let seq = 0;
  const next = () => seq++;

  return (
    <svg viewBox="-2 -2 124 84" className="pitch" role="img" aria-label="Spielzug vom Pre-Assist bis zum Tor">
      <g className="pitch-markings">
        <rect x={0} y={0} width={120} height={80} />
        <line x1={60} y1={0} x2={60} y2={80} />
        <circle cx={60} cy={40} r={10} />
        <rect x={102} y={18} width={18} height={44} />
        <rect x={114} y={30} width={6} height={20} />
        <rect x={120} y={36} width={1.5} height={8} />
        <circle cx={108} cy={40} r={0.4} className="spot" />
        <path d="M 102 32.7 A 10 10 0 0 0 102 47.3" />
        <rect x={0} y={18} width={18} height={44} />
      </g>

      {goal.pre && <Arrow from={goal.pre.start} to={goal.pre.end} cls="pre" seq={next()} />}
      {goal.pre && goal.assist && <Carry from={goal.pre.end} to={goal.assist.start} seq={next()} />}
      {goal.assist && <Arrow from={goal.assist.start} to={goal.assist.end} cls="assist" seq={next()} />}
      {goal.assist && <Carry from={goal.assist.end} to={goal.shot.start} seq={next()} />}
      <Arrow from={goal.shot.start} to={goalTarget} cls="shot" seq={next()} />

      {goal.pre && <Dot at={goal.pre.start} label="1" cls="pre" seq={0} />}
      {goal.assist && <Dot at={goal.assist.start} label={goal.pre ? "2" : "1"} cls="assist" seq={goal.pre ? 2 : 0} />}
      <Dot at={goal.shot.start} label="T" cls="shot" seq={Math.max(0, seq - 1)} />
    </svg>
  );
}
