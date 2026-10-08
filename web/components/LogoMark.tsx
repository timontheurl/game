// Das PA-Zeichen: eine Passkette aus drei Stationen, die zugleich ein P und ein A bildet.
// Mit `play` baut es sich als Passkette auf: Ausgangspunkt, Pass, Pass, Pass – dann steht das Logo.
// `loop` wiederholt das als Ladeanzeige. Die Abläufe stehen in globals.css unter „Logo“.

export default function LogoMark({
  play = false,
  loop = false,
  className = "",
  label,
}: {
  play?: boolean;
  loop?: boolean;
  className?: string;
  label?: string;
}) {
  const cls = ["logo-mark", play || loop ? "is-playing" : "", loop ? "is-loop" : "", className].filter(Boolean).join(" ");
  return (
    <svg
      className={cls}
      viewBox="0 0 256 256"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g className="logo-body">
        <g fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round">
          {/* Reihenfolge der Pässe: links unten → oben → unten rechts → links oben */}
          <path className="logo-pass logo-pass-1" d="M45 205 L200 48" pathLength={1} />
          <path className="logo-pass logo-pass-2" d="M200 48 L200 202" pathLength={1} />
          <path className="logo-pass logo-pass-3" d="M200 202 L97 64" pathLength={1} />
        </g>
        <g fill="currentColor">
          <circle className="logo-stop logo-stop-1" cx="45" cy="205" r="15" />
          <circle className="logo-stop logo-stop-2" cx="200" cy="48" r="15" />
          <circle className="logo-stop logo-stop-3" cx="200" cy="202" r="15" />
        </g>
        <circle className="logo-ball" r="8" />
      </g>
    </svg>
  );
}
