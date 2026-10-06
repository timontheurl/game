import PreAssistMap from "./PreAssistMap";
import PlayerCard from "./PlayerCard";
import { describePass } from "@/lib/cards";
import { toCard, type Goal, type PlayerRow, type Season } from "@/lib/data";

/** Verlauf der Pre-Assists über die Saison als Treppenkurve. */
function SeasonCurve({ season, goals }: { season: Season; goals: Goal[] }) {
  const dates = Object.values(season.matches).map((m) => new Date(m.date).getTime());
  const start = Math.min(...dates);
  const end = Math.max(...dates);
  const span = Math.max(1, end - start);
  const points = goals
    .map((g) => new Date(season.matches[String(g.match)].date).getTime())
    .sort((a, b) => a - b);

  const W = 300;
  const H = 110;
  const maxY = Math.max(1, points.length);
  const x = (t: number) => ((t - start) / span) * W;
  const y = (n: number) => H - (n / maxY) * (H - 12) - 4;

  let d = `M0 ${y(0)}`;
  points.forEach((t, i) => {
    d += ` L${x(t).toFixed(1)} ${y(i).toFixed(1)} L${x(t).toFixed(1)} ${y(i + 1).toFixed(1)}`;
  });
  d += ` L${W} ${y(points.length)}`;

  const month = (t: number) => new Date(t).toLocaleDateString("de-AT", { month: "short", year: "2-digit" });

  return (
    <figure className="curve">
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label="Pre-Assists im Saisonverlauf">
        <path d={`${d} L${W} ${H} L0 ${H} Z`} className="curve-area" />
        <path d={d} className="curve-line" pathLength={1} />
        {points.map((t, i) => (
          <circle key={i} cx={x(t)} cy={y(i + 1)} r={3} className="curve-dot" />
        ))}
      </svg>
      <figcaption>
        <span>{month(start)}</span>
        <span>{month(end)}</span>
      </figcaption>
    </figure>
  );
}

export default function PlayerInsights({ season, row, goals }: { season: Season; row: PlayerRow; goals: Goal[] }) {
  const types = new Map<string, number>();
  for (const g of goals) {
    const t = describePass(g.pre!);
    types.set(t, (types.get(t) ?? 0) + 1);
  }
  const typeRows = [...types.entries()].sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(1, ...typeRows.map(([, n]) => n));

  // Ähnliche Spieler: gleiche Saison, ähnlich viele Pre-Assists pro 90, bevorzugt gleiche Position
  const rate = (p: PlayerRow) => (p.minutes > 0 ? (p.preAssists / p.minutes) * 90 : 0);
  const similar = season.players
    .filter((p) => p.id !== row.id && p.minutes >= 600 && p.preAssists >= Math.max(1, Math.ceil(row.preAssists / 2)))
    .map((p) => ({ p, score: Math.abs(rate(p) - rate(row)) + (p.position === row.position ? 0 : 0.08) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ p }) => p);

  return (
    <>
      {goals.length > 0 && (
        <div className="insights">
          <div className="insight">
            <h3 className="sub-title">Wo die Pre-Assists starten</h3>
            <PreAssistMap goals={goals} label={`Startpunkte der Pre-Assists von ${row.name}`} />
          </div>
          <div className="insight">
            <h3 className="sub-title">Pass-Arten</h3>
            <ul className="type-bars">
              {typeRows.map(([t, n]) => (
                <li key={t}>
                  <span>{t}</span>
                  <span className="tb-bar">
                    <i style={{ width: `${(n / maxType) * 100}%` }} />
                  </span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
            <h3 className="sub-title">Saisonverlauf</h3>
            <SeasonCurve season={season} goals={goals} />
          </div>
        </div>
      )}

      {similar.length > 0 && (
        <>
          <h2 className="section-title">Ähnliche Spieler</h2>
          <p className="muted section-note">Ähnlich viele Pre-Assists pro 90 Minuten in derselben Saison.</p>
          <div className="card-grid similar-grid">
            {similar.map((p) => (
              <PlayerCard key={p.id} card={toCard(season, p)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
