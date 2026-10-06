import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RankingTable from "@/components/RankingTable";
import { getSeason, getSeasons, playerSlug, seasonLabel, topCombos, type Season } from "@/lib/data";

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
  const share = meta.goals ? Math.round((meta.preAssists / meta.goals) * 100) : 0;

  return (
    <>
      <section className="page-head">
        <p className="eyebrow">{meta.country}</p>
        <h1>Pre-Assists {seasonLabel(meta)}</h1>
        {meta.coverage === "team" && (
          <p className="notice">
            Für diese Saison sind nur die {meta.matches} Spiele von <strong>{meta.coverageTeam}</strong> als
            offene Daten verfügbar. Die Rangliste zeigt daher nur Spieler von {meta.coverageTeam}.
          </p>
        )}
        <div className="stat-row">
          <div>
            <strong>{meta.matches}</strong>
            <span>Spiele</span>
          </div>
          <div>
            <strong>{meta.goals}</strong>
            <span>Tore</span>
          </div>
          <div>
            <strong>{meta.assists}</strong>
            <span>mit Assist</span>
          </div>
          <div>
            <strong>{meta.preAssists}</strong>
            <span>mit Pre-Assist ({share} %)</span>
          </div>
        </div>
      </section>

      <section>
        <h2>Rangliste</h2>
        <RankingTable players={season.players} teams={season.teams} />
      </section>

      {combos.length > 0 && (
        <section>
          <h2>Häufigste Torketten</h2>
          <p className="muted">Pre-Assist → Assist → Tor: welche Trios am häufigsten zusammen getroffen haben.</p>
          <ul className="combos">
            {combos.map((c) => (
              <li key={`${c.pre}-${c.assist}-${c.scorer}`}>
                <span className="combo-count">{c.count}×</span>
                <span className="combo-chain">
                  <span className="pre-color">
                    <Name season={season} id={c.pre} />
                  </span>
                  <span className="sep">→</span>
                  <span className="assist-color">
                    <Name season={season} id={c.assist} />
                  </span>
                  <span className="sep">→</span>
                  <span className="shot-color">
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
