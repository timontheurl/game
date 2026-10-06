import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CountUp from "@/components/CountUp";
import PlayerCard from "@/components/PlayerCard";
import RankingTable from "@/components/RankingTable";
import ClubBadge from "@/components/ClubBadge";
import { getSeason, getSeasons, playerSlug, seasonClubs, seasonLabel, toCard, topCombos, type Season } from "@/lib/data";

export function generateStaticParams() {
  return getSeasons().map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const season = getSeason((await params).slug);
  return { title: season ? `Pre-Assists ${seasonLabel(season.meta)}` : "Wettbewerb" };
}

function Name({ season, id }: { season: Season; id: number }) {
  const slug = playerSlug(season, id);
  const name = season.names[String(id)];
  return slug ? <Link href={`/spieler/${slug}/`}>{name}</Link> : <span>{name}</span>;
}

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const season = getSeason((await params).slug);
  if (!season) notFound();
  const { meta } = season;
  const combos = topCombos(season);

  return (
    <>
      <section className="banner">
        <div>
          <span className="banner-kicker">{meta.country}</span>
          <h1>{seasonLabel(meta)}</h1>
        </div>
        <div className="banner-facts">
          <span>
            <b>
              <CountUp value={meta.matches} />
            </b> Spiele
          </span>
          <span>
            <b>
              <CountUp value={meta.goals} />
            </b> Tore
          </span>
          <span>
            <b>
              <CountUp value={meta.preAssists} />
            </b> mit Pre-Assist
          </span>
        </div>
      </section>

      {meta.coverage === "team" && (
        <p className="notice">
          Für diese Saison gibt es nur die Spiele von <b>{meta.coverageTeam}</b> als offene Daten. Die Rangliste zeigt
          deshalb nur Spieler von {meta.coverageTeam}.
        </p>
      )}

      <section className="section">
        <h2 className="section-title">Top 8</h2>
        <div className="card-grid">
          {season.players.slice(0, 8).map((p) => (
            <PlayerCard key={p.id} card={toCard(season, p)} />
          ))}
        </div>
      </section>

      {season.meta.coverage === "full" && (
        <section className="section">
          <h2 className="section-title">Vereine</h2>
          <div className="club-grid">
            {seasonClubs(season).map(({ club, goals, preAssists, leader }, i) => (
              <Link key={club.slug} href={`/verein/${club.slug}/`} className="club-tile">
                <span className="ct-rank">{i + 1}</span>
                <ClubBadge name={club.name} size={40} />
                <span className="ct-main">
                  <span className="ct-name">{club.name}</span>
                  {leader && (
                    <span className="ct-leader">
                      {leader.name} · {leader.preAssists}
                    </span>
                  )}
                </span>
                <span className="ct-num">
                  <b>{preAssists}</b>
                  <small>von {goals} Toren</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Alle Spieler</h2>
        <RankingTable players={season.players} teams={season.teams} />
      </section>

      {combos.length > 0 && (
        <section className="section">
          <h2 className="section-title">Häufigste Torketten</h2>
          <ul className="combo-list">
            {combos.map((c) => (
              <li key={`${c.pre}-${c.assist}-${c.scorer}`}>
                <b className="pl-count">{c.count}×</b>
                <span className="chain-names">
                  <span className="c-pre">
                    <Name season={season} id={c.pre} />
                  </span>
                  <span className="c-sep">›</span>
                  <span className="c-ast">
                    <Name season={season} id={c.assist} />
                  </span>
                  <span className="c-sep">›</span>
                  <span className="c-goal">
                    <Name season={season} id={c.scorer} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
