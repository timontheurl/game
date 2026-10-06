import type { Metadata } from "next";
import Link from "next/link";
import ClubBadge from "@/components/ClubBadge";
import { getSeasons, seasonClubs, seasonLabel } from "@/lib/data";

export const metadata: Metadata = {
  title: "Vereine",
  description: "Alle Vereine nach Pre-Assists: Welche Mannschaft bereitet ihre Tore am häufigsten über zwei Pässe vor?",
};

export default function VereinePage() {
  return (
    <>
      <section className="page-intro">
        <h1>Vereine</h1>
        <p>Welche Mannschaft spielt ihre Tore am häufigsten über zwei Stationen heraus? Sortiert nach Pre-Assists.</p>
      </section>
      {getSeasons().map((season) => (
        <section key={season.meta.slug} className="section">
          <h2 className="section-title">{seasonLabel(season.meta)}</h2>
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
      ))}
    </>
  );
}
