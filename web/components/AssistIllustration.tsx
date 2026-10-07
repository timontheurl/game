import { arrowHead, shorten, type Pt } from "@/lib/geom";
import { t, type Lang } from "@/lib/i18n";

/**
 * Erklärgrafik: Steckpass (Pre-Assist) → Querleger (Assist) → Tor.
 * Halbes Spielfeld, Tor oben. Maße in Dezimetern (Breite 68 m, halbe Länge 52,5 m).
 * Die Szene spielt sich in einer Schleife ab: Pässe zeichnen sich, der Ball läuft mit.
 */

const P1: Pt = [220, 402];
const P2: Pt = [524, 150];
const P3: Pt = [330, 112];
const GOAL: Pt = [352, 4];

const DEFENDERS: Pt[] = [
  [175, 222],
  [290, 214],
  [392, 210],
  [505, 226],
];

function Pass({ from, to, cls }: { from: Pt; to: Pt; cls: string }) {
  const start = shorten(to, from, 20); // nicht im Spielerkreis beginnen
  const end = shorten(start, to, 34);
  return (
    <g className={`ill-pass ${cls}`}>
      <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} pathLength={1} />
      <polygon points={arrowHead(start, shorten(start, to, 20), 22, 22)} />
    </g>
  );
}

export default function AssistIllustration({ lang = "de" }: { lang?: Lang }) {
  const ballPath = `M${P1[0]} ${P1[1]} L${P2[0]} ${P2[1]} L${P3[0]} ${P3[1]} L${GOAL[0]} ${GOAL[1] + 14}`;

  return (
    <svg viewBox="-30 -50 740 610" className="illustration" role="img" aria-labelledby="ill-title">
      <title id="ill-title">{t(lang, "ill.title")}</title>
      <defs>
        <pattern id="ill-stripes" width="680" height="105" patternUnits="userSpaceOnUse">
          <rect width="680" height="52.5" className="ill-stripe" />
        </pattern>
        <radialGradient id="ill-ball" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#c9ced6" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="680" height="525" fill="url(#ill-stripes)" />
      <g className="ill-lines">
        <rect x="0" y="0" width="680" height="525" />
        <rect x="138.5" y="0" width="403" height="165" />
        <rect x="248.5" y="0" width="183" height="55" />
        <rect x="303.4" y="-24" width="73.2" height="24" className="ill-goal" />
        <path d="M266.9 165 A91.5 91.5 0 0 0 413.1 165" />
        <path d="M248.5 525 A91.5 91.5 0 0 1 431.5 525" />
        <circle cx="340" cy="110" r="3.5" className="ill-spot" />
      </g>

      {/* Laufweg des Assistgebers in die Tiefe */}
      <path d="M598 360 Q585 250 528 170" className="ill-run" pathLength={1} />

      {DEFENDERS.map(([x, y], i) => (
        <g key={x} className="ill-defender" style={{ "--i": i } as React.CSSProperties}>
          <circle cx={x} cy={y} r="12" />
          <path d={`M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`} />
        </g>
      ))}

      <Pass from={P1} to={P2} cls="pre" />
      <Pass from={P2} to={P3} cls="ast" />
      <Pass from={P3} to={GOAL} cls="goal" />

      <g className="ill-player pre">
        <circle cx={P1[0]} cy={P1[1]} r="17" />
        <text x={P1[0]} y={P1[1] + 7}>1</text>
      </g>
      <g className="ill-player ast">
        <circle cx={P2[0]} cy={P2[1]} r="17" />
        <text x={P2[0]} y={P2[1] + 7}>2</text>
      </g>
      <g className="ill-player goal">
        <circle cx={P3[0]} cy={P3[1]} r="17" />
        <text x={P3[0]} y={P3[1] + 7}>3</text>
      </g>

      <circle r="9" fill="url(#ill-ball)" className="ill-ball">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path={ballPath}
          keyPoints="0;0;0.572;0.572;0.859;0.859;1;1"
          keyTimes="0;0.06;0.28;0.36;0.50;0.56;0.66;1"
          calcMode="linear"
        />
      </circle>

      <text x="250" y="455" className="ill-label pre">
        {t(lang, "ill.pre")}
      </text>
      <text x="545" y="105" className="ill-label ast" textAnchor="middle">
        {t(lang, "ill.ast")}
      </text>
      <text x="400" y="-14" className="ill-label goal">
        {t(lang, "ill.goal")}
      </text>
    </svg>
  );
}
