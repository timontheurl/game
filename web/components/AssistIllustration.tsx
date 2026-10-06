/**
 * Erklärgrafik: Steckpass (Pre-Assist) → Querleger (Assist) → Tor.
 * Halbes Spielfeld, Tor oben. Maße in Dezimetern (Breite 68 m, halbe Länge 52,5 m).
 */
export default function AssistIllustration() {
  const defenders: [number, number][] = [
    [175, 222],
    [290, 214],
    [392, 210],
    [505, 226],
  ];

  return (
    <svg viewBox="-30 -50 740 610" className="illustration" role="img" aria-labelledby="ill-title">
      <title id="ill-title">Steckpass als Pre-Assist, Querleger als Assist, dann das Tor</title>
      <defs>
        <pattern id="ill-stripes" width="680" height="105" patternUnits="userSpaceOnUse">
          <rect width="680" height="52.5" className="ill-stripe" />
        </pattern>
        {["pre", "ast", "goal"].map((k) => (
          <marker key={k} id={`ill-arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" className={`ill-head-${k}`} />
          </marker>
        ))}
      </defs>

      <rect x="0" y="0" width="680" height="525" fill="url(#ill-stripes)" />
      <g className="ill-lines">
        <rect x="0" y="0" width="680" height="525" />
        <rect x="138.5" y="0" width="403" height="165" />
        <rect x="248.5" y="0" width="183" height="55" />
        <rect x="303.4" y="-24" width="73.2" height="24" />
        <path d="M266.9 165 A91.5 91.5 0 0 0 413.1 165" />
        <path d="M248.5 525 A91.5 91.5 0 0 1 431.5 525" />
        <circle cx="340" cy="110" r="3.5" className="ill-spot" />
      </g>

      {/* Laufweg des Assistgebers */}
      <path d="M598 360 Q585 250 528 160" className="ill-run" />

      {/* Abwehrkette */}
      {defenders.map(([x, y]) => (
        <g key={x} className="ill-defender">
          <circle cx={x} cy={y} r="12" />
          <path d={`M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`} />
        </g>
      ))}

      {/* 1: Steckpass, 2: Querleger, 3: Abschluss */}
      <line x1="232" y1="392" x2="512" y2="162" className="ill-pass pre" markerEnd="url(#ill-arrow-pre)" />
      <line x1="512" y1="152" x2="352" y2="112" className="ill-pass ast" markerEnd="url(#ill-arrow-ast)" />
      <line x1="332" y1="100" x2="352" y2="6" className="ill-pass goal" markerEnd="url(#ill-arrow-goal)" />

      <g className="ill-player pre">
        <circle cx="220" cy="402" r="17" />
        <text x="220" y="409">1</text>
      </g>
      <g className="ill-player ast">
        <circle cx="524" cy="150" r="17" />
        <text x="524" y="157">2</text>
      </g>
      <g className="ill-player goal">
        <circle cx="330" cy="112" r="17" />
        <text x="330" y="119">3</text>
      </g>

      <text x="250" y="455" className="ill-label pre">Steckpass = Pre-Assist</text>
      <text x="545" y="105" className="ill-label ast" textAnchor="middle">
        Querleger = Assist
      </text>
      <text x="400" y="-14" className="ill-label goal">Tor</text>
    </svg>
  );
}
