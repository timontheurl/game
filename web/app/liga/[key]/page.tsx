import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AssistIllustration from "@/components/AssistIllustration";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import { getLeagueStatuses, toCard } from "@/lib/data";
import { LEAGUES, getLeague } from "@/lib/leagues";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ key: l.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const league = getLeague((await params).key);
  return { title: league ? `${league.name} – Pre-Assists` : "Liga" };
}

export default async function LeaguePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const status = getLeagueStatuses().find((s) => s.league.key === key);
  if (!status) notFound();
  const { league, seasons } = status;

  return (
    <>
      <section className="banner">
        <div>
          <span className="banner-kicker">
            <Flag code={league.flag} /> {league.country}
          </span>
          <h1>{league.name}</h1>
        </div>
        <div className="banner-facts">
          {seasons.length > 0 ? (
            <span>
              <b>{seasons.length}</b> {seasons.length === 1 ? "Saison" : "Saisons"}
            </span>
          ) : (
            <span className="lt-badge">Daten folgen</span>
          )}
        </div>
      </section>

      {seasons.length === 0 ? (
        <section className="coming-soon">
          <div>
            <h2>In Vorbereitung</h2>
            <p>{league.blurb}</p>
            <p className="muted">
              Für die {league.name} gibt es noch keine frei verfügbaren Spieldaten mit jedem einzelnen Pass. Sobald
              die Daten angebunden sind, erscheinen hier automatisch Ranglisten, Spielerkarten, Vereinsseiten und alle
              Torketten – genau wie bei den Ligen, die schon live sind.
            </p>
            <Link href="/ligen/" className="text-link">
              Alle Ligen ansehen
            </Link>
          </div>
          <figure className="intro-figure">
            <AssistIllustration />
          </figure>
        </section>
      ) : (
        seasons.map((season) => (
          <section key={season.meta.slug} className="section">
            <div className="section-head">
              <h2 className="section-title">Saison {season.meta.season}</h2>
              <Link href={`/wettbewerb/${season.meta.slug}/`} className="text-link">
                Rangliste und alle Spieler
              </Link>
            </div>
            {season.meta.coverage === "team" && (
              <p className="notice">Nur die Spiele von {season.meta.coverageTeam} sind ausgewertet.</p>
            )}
            <div className="card-grid">
              {season.players.slice(0, 8).map((p) => (
                <PlayerCard key={p.id} card={toCard(season, p)} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
