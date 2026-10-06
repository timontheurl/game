import type { Goal, Point } from "@/lib/data";

// StatsBomb-Koordinaten: x 0–120 (Angriff nach rechts), y 0–80.

function Arrow({ from, to, cls, dashed }: { from: Point; to: Point; cls: string; dashed?: boolean }) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      className={`pitch-line ${cls}`}
      strokeDasharray={dashed ? "1.2 1.2" : undefined}
      markerEnd={dashed ? undefined : `url(#arrow-${cls})`}
    />
  );
}

function Dot({ at, label, cls }: { at: Point; label: string; cls: string }) {
  return (
    <g className={`pitch-dot ${cls}`}>
      <circle cx={at[0]} cy={at[1]} r={2.3} />
      <text x={at[0]} y={at[1] + 0.95} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

const MARKERS = ["pre", "assist", "shot"];

export default function Pitch({ goal }: { goal: Goal }) {
  const goalTarget: Point = goal.shot.end ?? [120, 40];

  return (
    <svg
      viewBox="-2 -2 124 84"
      className="pitch"
      role="img"
      aria-label="Spielzug vom Pre-Assist bis zum Tor"
    >
      <defs>
        {MARKERS.map((m) => (
          <marker
            key={m}
            id={`arrow-${m}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={`arrow-head ${m}`} />
          </marker>
        ))}
      </defs>
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

      {goal.pre && <Arrow from={goal.pre.start} to={goal.pre.end} cls="pre" />}
      {goal.pre && goal.assist && <Arrow from={goal.pre.end} to={goal.assist.start} cls="carry" dashed />}
      {goal.assist && <Arrow from={goal.assist.start} to={goal.assist.end} cls="assist" />}
      {goal.assist && <Arrow from={goal.assist.end} to={goal.shot.start} cls="carry" dashed />}
      <Arrow from={goal.shot.start} to={[goalTarget[0], goalTarget[1]]} cls="shot" />

      {goal.pre && <Dot at={goal.pre.start} label="1" cls="pre" />}
      {goal.assist && <Dot at={goal.assist.start} label={goal.pre ? "2" : "1"} cls="assist" />}
      <Dot at={goal.shot.start} label="T" cls="shot" />
    </svg>
  );
}
