import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClubBadge from "@/components/ClubBadge";
import CountUp from "@/components/CountUp";
import PlayerCard from "@/components/PlayerCard";
import PreAssistMap from "@/components/PreAssistMap";
import RankingTable from "@/components/RankingTable";
import { getClub, getClubs, playerSlug, seasonLabel, toCard, topCombos, type Season } from "@/lib/data";

export function generateStaticParams() {
  return getClubs().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const club = getClub((await params).slug);
  return {
    title: club ? `${club.name} – Pre-Assists` : "Verein",
    description: club ? `Wer bei ${club.name} die Tore vorbereitet: Pre-Assists, Torketten und Spielerkarten.` : undefined,
  };
}

function Name({ season, id }: { season: Season; id: number }) {
  const slug = playerSlug(season, id);
  const name = season.names[String(id)];
  return slug ? <Link href={`/spieler/${slug}/`}>{name}</Link> : <span>{name}</span>;
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const club = getClub((await params).slug);
  if (!club) notFound();

  return (
    <>
      <section className="banner club-banner">
        <div className="club-title">
          <ClubBadge name={club.name} size={72} />
          <div>
            <span className="banner-kicker">Verein</span>
            <h1>{club.name}</h1>
          </div>
        </div>
      </section>

      {club.seasons.map((cs) => {
        const { season } = cs;
        const withPre = cs.goals.filter((g) => g.pre).length;
        const withAssist = cs.goals.filter((g) => g.assist).length;
        const sorted = [...cs.players].sort((a, b) => b.preAssists - a.preAssists || b.involvements - a.involvements);
        const combos = topCombos(season, 6, cs.teamId);
        return (
          <section key={season.meta.slug} className="section">
            <div className="section-head">
              <h2 className="section-title">{seasonLabel(season.meta)}</h2>
              <Link href={`/wettbewerb/${season.meta.slug}/`} className="text-link">
                Liga-Rangliste
              </Link>
            </div>

            <div className="club-facts">
              <div>
                <b>
                  <CountUp value={cs.goals.length} />
                </b>
                <span>Tore</span>
              </div>
              <div>
                <b>
                  <CountUp value={withAssist} />
                </b>
                <span>mit Assist</span>
              </div>
              <div className="is-accent">
                <b>
                  <CountUp value={withPre} />
                </b>
                <span>mit Pre-Assist</span>
              </div>
              <div>
                <b>
                  <CountUp value={cs.goals.length ? Math.round((withPre / cs.goals.length) * 100) : 0} /> %
                </b>
                <span>Anteil</span>
              </div>
            </div>

            <div className="club-split">
              <div className="league-box">
                {sorted.slice(0, 3).map((p) => (
                  <PlayerCard key={p.id} card={toCard(season, p)} />
                ))}
              </div>
              <div>
                <h3 className="sub-title">Wo die Angriffe beginnen</h3>
                <PreAssistMap goals={cs.goals} label={`Startpunkte der Pre-Assists von ${club.name}`} />
              </div>
            </div>

            {combos.length > 0 && (
              <>
                <h3 className="sub-title">Häufigste Torketten</h3>
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
              </>
            )}

            <h3 className="sub-title">Kader</h3>
            <RankingTable players={cs.players} teams={season.teams} hideTeam />
          </section>
        );
      })}
    </>
  );
}
