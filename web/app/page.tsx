import Link from "next/link";
import AssistIllustration from "@/components/AssistIllustration";
import PlayerCard from "@/components/PlayerCard";
import { getSeasons, seasonLabel, toCard, type PlayerRow, type Season } from "@/lib/data";

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

/** Kurzer Text zur Spitze der Rangliste, aus den Daten erzeugt. */
function leagueText(season: Season, top: PlayerRow[]) {
  const { meta } = season;
  const team = (p: PlayerRow) => season.teams[String(p.team)];
  const best = top[0];
  const leaders = top.filter((p) => p.preAssists === best.preAssists);
  const share = meta.goals ? Math.round((meta.preAssists / meta.goals) * 100) : 0;

  let lead: string;
  if (leaders.length > 1) {
    lead = `${joinNames(leaders.map((p) => p.name))} teilen sich die Spitze mit je ${best.preAssists} Pre-Assists.`;
  } else {
    const extra =
      best.assists === 0
        ? " – und das ganz ohne eigenen Assist."
        : best.assists < best.preAssists
          ? `, mehr als Assists (${best.assists}).`
          : `, dazu kommen ${best.assists} Assists.`;
    lead = `${best.name} (${team(best)}) führt mit ${best.preAssists} Pre-Assists${extra}`;
  }

  const rest = top.filter((p) => !leaders.includes(p));
  const follow = rest.length
    ? `Dahinter: ${joinNames(rest.map((p) => `${p.name} (${p.preAssists})`))}.`
    : "";

  const context =
    meta.coverage === "team"
      ? `Ausgewertet sind die ${meta.matches} Spiele von ${meta.coverageTeam}. Bei ${share} % der Tore in diesen Spielen gab es einen Pre-Assist.`
      : `In ${meta.matches} Spielen fielen ${meta.goals.toLocaleString("de-AT")} Tore. Bei ${share} % davon gab es einen Pre-Assist.`;

  return { lead, follow, context };
}

export default function Home() {
  const seasons = getSeasons();

  return (
    <>
      <section className="intro">
        <div className="intro-text">
          <h1>
            Jedes Tor hat eine <span>Vorgeschichte.</span>
          </h1>
          <p className="intro-lead">
            Der Torschütze bekommt die Schlagzeile, der Vorlagengeber die Erwähnung. Das Entscheidende passiert aber oft
            einen Pass früher: der Steckpass, der die Abwehrkette aufreißt, bevor der Querleger zum Tor kommt.
          </p>
          <p>
            Dieser Pass vor dem Assist ist der <strong>Pre-Assist</strong>. Ohne ihn gibt es keine Torvorlage und kein
            Tor – trotzdem taucht er in keiner gängigen Statistik auf. Hier zählen wir ihn: für jedes Tor, jeden Spieler
            und jede Liga.
          </p>
          <Link href="/methodik/" className="text-link">
            So zählen wir Pre-Assists
          </Link>
        </div>
        <figure className="intro-figure">
          <AssistIllustration />
        </figure>
      </section>

      {seasons.filter((s) => !s.meta.national).map((season, i) => {
        const top = season.players.slice(0, 3);
        const text = leagueText(season, top);
        return (
          <section key={season.meta.slug} className={`league-row ${i % 2 ? "is-reversed" : ""}`}>
            <div className="league-box">
              {top.map((p) => (
                <PlayerCard key={p.id} card={toCard(season, p)} />
              ))}
            </div>
            <div className="league-text">
              <span className="league-kicker">Top 3 · {season.meta.country}</span>
              <h2>{seasonLabel(season.meta)}</h2>
              <p className="league-lead">{text.lead}</p>
              {text.follow && <p>{text.follow}</p>}
              <p className="muted">{text.context}</p>
              <Link href={`/wettbewerb/${season.meta.slug}/`} className="text-link">
                Ganze Rangliste
              </Link>
            </div>
          </section>
        );
      })}

      <section className="section tournaments">
        <h2 className="section-title">Turniere</h2>
        <div className="league-grid">
          {seasons
            .filter((s) => s.meta.national)
            .map((s) => {
              const top = s.players[0];
              return (
                <Link key={s.meta.slug} href={`/wettbewerb/${s.meta.slug}/`} className="league-tile is-live">
                  <span className="lt-name">{seasonLabel(s.meta)}</span>
                  <span className="lt-country">{s.meta.country}</span>
                  {top && (
                    <span className="lt-leader">
                      Spitze: <b>{top.name}</b> · {top.preAssists} Pre-Assists
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </section>
    </>
  );
}
