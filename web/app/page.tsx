import Link from "next/link";
import Pitch from "@/components/Pitch";
import { getSeasons, hiddenArchitects, seasonLabel } from "@/lib/data";

export default function Home() {
  const seasons = getSeasons();
  const architects = hiddenArchitects();
  const totalPre = seasons.reduce((n, s) => n + s.meta.preAssists, 0);
  const totalGoals = seasons.reduce((n, s) => n + s.meta.goals, 0);

  // Beispiel-Tor für die Erklärgrafik: ein schöner Spielzug aus La Liga
  const example = seasons
    .flatMap((s) => s.goals.map((g) => ({ s, g })))
    .find(({ g }) => g.pre && g.assist && g.pre.start[0] < 70 && g.assist.through);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Die Anlaufstelle für Pre-Assists</p>
          <h1>
            Jeder kennt den Torschützen.
            <br />
            <span className="accent">Wir zeigen, wer das Tor möglich gemacht hat.</span>
          </h1>
          <p className="lead">
            Der <strong>Pre-Assist</strong> ist der Pass vor dem Assist – oft der Moment, in dem eine Abwehr
            geknackt wird. In klassischen Statistiken taucht er nirgends auf. Hier schon.
          </p>
          <div className="hero-stats">
            <div>
              <strong>{totalPre.toLocaleString("de-AT")}</strong>
              <span>Pre-Assists erfasst</span>
            </div>
            <div>
              <strong>{totalGoals.toLocaleString("de-AT")}</strong>
              <span>Tore analysiert</span>
            </div>
            <div>
              <strong>{seasons.length}</strong>
              <span>Wettbewerbe</span>
            </div>
          </div>
        </div>
        {example && (
          <figure className="hero-figure">
            <Pitch goal={example.g} />
            <figcaption>
              <span className="legend pre">1 Pre-Assist</span>
              <span className="legend assist">2 Assist</span>
              <span className="legend shot">T Tor</span>
            </figcaption>
          </figure>
        )}
      </section>

      <section>
        <h2>Pre-Assist-Könige je Wettbewerb</h2>
        <div className="grid cards">
          {seasons.map((s) => (
            <Link key={s.meta.slug} href={`/wettbewerb/${s.meta.slug}/`} className="card">
              <div className="card-head">
                <div>
                  <h3>{seasonLabel(s.meta)}</h3>
                  <p className="muted small">
                    {s.meta.country}
                    {s.meta.coverage === "team" && ` · nur Spiele von ${s.meta.coverageTeam}`}
                  </p>
                </div>
                <span className="badge">{s.meta.preAssists} PA</span>
              </div>
              <ol className="top-list">
                {s.players.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.name} <span className="muted small">{s.teams[String(p.team)]}</span>
                    </span>
                    <strong>{p.preAssists}</strong>
                  </li>
                ))}
              </ol>
              <span className="card-link">Zur ganzen Rangliste →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2>Die stillen Architekten</h2>
        <p className="muted">
          Spieler mit mehr Pre-Assists als Assists – sie tauchen in keiner Scorerliste auf, stehen aber am Anfang
          vieler Tore.
        </p>
        <div className="grid architects">
          {architects.map(({ season, row }) => (
            <Link key={`${season.meta.slug}-${row.id}`} href={`/spieler/${row.slug}/`} className="architect">
              <strong>{row.name}</strong>
              <span className="muted small">
                {season.teams[String(row.team)]} · {seasonLabel(season.meta)}
              </span>
              <span className="architect-stats">
                <span className="pre-color">{row.preAssists} Pre-Assists</span>
                <span>{row.assists} Assists</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
