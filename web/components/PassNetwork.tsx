import type { Goal, Point } from "@/lib/data";
import { t, type Lang } from "@/lib/i18n";

/**
 * Passnetzwerk einer Mannschaft: Wer spielt wem bei Toren den Pre-Assist bzw. die Vorlage zu?
 * Spieler stehen ungefähr an ihrem durchschnittlichen Aktionsort (aufs Feld gestreckt, damit nichts überlappt),
 * die Linienstärke zeigt, wie oft die Verbindung zum Tor führte.
 */
export default function PassNetwork({
  goals,
  names,
  lang = "de",
}: {
  goals: Goal[];
  names: Record<string, string>;
  lang?: Lang;
}) {
  const spots = new Map<number, Point[]>();
  const add = (id: number, p: Point) => spots.set(id, [...(spots.get(id) ?? []), p]);
  const edges = new Map<string, { from: number; to: number; kind: "pre" | "assist"; n: number }>();
  const link = (from: number, to: number, kind: "pre" | "assist") => {
    if (from === to) return;
    const key = `${kind}:${from}:${to}`;
    const e = edges.get(key) ?? { from, to, kind, n: 0 };
    e.n++;
    edges.set(key, e);
  };

  for (const g of goals) {
    if (!g.assist) continue;
    add(g.scorer, g.shot.start);
    add(g.assist.player, g.assist.start);
    link(g.assist.player, g.scorer, "assist");
    if (g.pre) {
      add(g.pre.player, g.pre.start);
      link(g.pre.player, g.assist.player, "pre");
    }
  }

  const top = [...edges.values()].sort((a, b) => b.n - a.n).slice(0, 24);
  if (top.length === 0) return null;
  const used = new Set(top.flatMap((e) => [e.from, e.to]));
  const pos = new Map<number, Point>();
  for (const id of used) {
    const pts = spots.get(id)!;
    pos.set(id, [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]);
  }
  // Auf das ganze Feld strecken (die Reihenfolge der Positionen bleibt erhalten) und Überlappungen auseinanderschieben
  const xs = [...pos.values()].map((p) => p[0]);
  const ys = [...pos.values()].map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (const [id, [x, y]] of pos) {
    pos.set(id, [
      x1 > x0 ? 14 + ((x - x0) / (x1 - x0)) * 92 : 60,
      y1 > y0 ? 10 + ((y - y0) / (y1 - y0)) * 60 : 40,
    ]);
  }
  const ids = [...pos.keys()];
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 0.01;
        const min = 13;
        if (d < min) {
          const push = (min - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          pos.set(ids[i], [Math.min(116, Math.max(4, a[0] - ux * push)), Math.min(76, Math.max(6, a[1] - uy * push))]);
          pos.set(ids[j], [Math.min(116, Math.max(4, b[0] + ux * push)), Math.min(76, Math.max(6, b[1] + uy * push))]);
        }
      }
    }
  }

  const weight = new Map<number, number>();
  for (const e of top) {
    weight.set(e.from, (weight.get(e.from) ?? 0) + e.n);
    weight.set(e.to, (weight.get(e.to) ?? 0) + e.n);
  }
  const maxN = Math.max(...top.map((e) => e.n));
  const lastName = (id: number) => {
    const n = names[String(id)] ?? "";
    const parts = n.split(" ");
    return parts.length > 1 ? parts[parts.length - 1] : n;
  };

  return (
    <figure className="network">
      <svg viewBox="-2 -2 124 84" className="pitch" role="img" aria-label={t(lang, "net.label")}>
        <g className="pitch-markings">
          <rect x={0} y={0} width={120} height={80} />
          <line x1={60} y1={0} x2={60} y2={80} />
          <circle cx={60} cy={40} r={10} />
          <rect x={102} y={18} width={18} height={44} />
          <rect x={0} y={18} width={18} height={44} />
        </g>
        {top.map((e, i) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          // leicht gebogen, damit Hin- und Rückweg zwischen zwei Spielern getrennt sichtbar sind
          const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * 0.15;
          const my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * 0.15;
          return (
            <path
              key={i}
              d={`M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`}
              className={`net-edge ${e.kind}`}
              style={{ strokeWidth: 0.4 + (e.n / maxN) * 1.6, "--seq": i % 12 } as React.CSSProperties}
            />
          );
        })}
        {[...used].map((id) => {
          const [x, y] = pos.get(id)!;
          const r = Math.min(3.6, 1.2 + Math.sqrt(weight.get(id)!) * 0.45);
          return (
            <g key={id} className="net-node">
              <circle cx={x} cy={y} r={r} />
              <text x={x} y={y - r - 1}>
                {lastName(id)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="network-legend">
        <span className="legend-pre">{t(lang, "net.pre")}</span>
        <span className="legend-ast">{t(lang, "net.ast")}</span>
        <span className="muted">{t(lang, "net.thick")}</span>
      </figcaption>
    </figure>
  );
}
