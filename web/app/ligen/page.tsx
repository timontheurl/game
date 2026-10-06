import type { Metadata } from "next";
import Link from "next/link";
import CountUp from "@/components/CountUp";
import { Flag } from "@/components/PlayerCard";
import { getLeagueStatuses } from "@/lib/data";

export const metadata: Metadata = {
  title: "Ligen",
  description: "Alle Ligen auf PreAssists – mit Pre-Assist-Ranglisten und den Ligen, die als Nächstes dazukommen.",
};

export default function LigenPage() {
  const statuses = getLeagueStatuses();
  const live = statuses.filter((s) => s.seasons.length > 0);
  const planned = statuses.filter((s) => s.seasons.length === 0);

  return (
    <>
      <section className="page-intro">
        <h1>Ligen</h1>
        <p>
          {live.length} Ligen mit Pre-Assist-Daten, {planned.length} weitere in Vorbereitung. Jede Liga bekommt
          Ranglisten, Vereinsseiten und alle Torketten.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Mit Daten</h2>
        <div className="league-grid">
          {live.map(({ league, seasons }) => {
            const goals = seasons.reduce((n, s) => n + s.meta.goals, 0);
            const pre = seasons.reduce((n, s) => n + s.meta.preAssists, 0);
            const leader = seasons[0].players[0];
            return (
              <Link key={league.key} href={`/liga/${league.key}/`} className="league-tile is-live reveal">
                <span className="lt-head">
                  <Flag code={league.flag} title={league.country} />
                  <span className="lt-badge live">Live</span>
                </span>
                <span className="lt-name">{league.name}</span>
                <span className="lt-country">{league.country}</span>
                <span className="lt-facts">
                  <span>
                    <b>{seasons.length}</b> {seasons.length === 1 ? "Saison" : "Saisons"}
                  </span>
                  <span>
                    <b>
                      <CountUp value={goals} />
                    </b> Tore
                  </span>
                  <span>
                    <b>
                      <CountUp value={pre} />
                    </b> Pre-Assists
                  </span>
                </span>
                {leader && (
                  <span className="lt-leader">
                    Spitze: <b>{leader.name}</b> · {leader.preAssists}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Bald dabei</h2>
        <div className="league-grid">
          {planned.map(({ league }) => (
            <Link key={league.key} href={`/liga/${league.key}/`} className="league-tile is-planned reveal">
              <span className="lt-head">
                <Flag code={league.flag} title={league.country} />
                <span className="lt-badge">Daten folgen</span>
              </span>
              <span className="lt-name">{league.name}</span>
              <span className="lt-country">{league.country}</span>
              <span className="lt-blurb">{league.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
