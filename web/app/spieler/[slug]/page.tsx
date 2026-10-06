import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GoalCard from "@/components/GoalCard";
import { getPlayer, getPlayerSlugs, playerSlug, seasonLabel } from "@/lib/data";

export function generateStaticParams() {
  return getPlayerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const entries = getPlayer((await params).slug);
  return { title: entries[0] ? `${entries[0].row.name} – Pre-Assists` : "Spieler" };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const entries = getPlayer((await params).slug);
  if (entries.length === 0) notFound();
  const { row } = entries[0];

  return (
    <>
      <section className="page-head">
        <p className="eyebrow">Spielerprofil</p>
        <h1>{row.name}</h1>
        {row.fullName !== row.name && <p className="muted">{row.fullName}</p>}
      </section>

      {entries.map(({ season, row: r, preGoals }) => {
        const partners = new Map<number, number>();
        for (const g of preGoals) partners.set(g.scorer, (partners.get(g.scorer) ?? 0) + 1);
        const topPartners = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const rank = season.players.filter((p) => p.preAssists > r.preAssists).length + 1;

        return (
          <section key={season.meta.slug} className="player-season">
            <h2>
              <Link href={`/wettbewerb/${season.meta.slug}/`}>{seasonLabel(season.meta)}</Link>
              <span className="muted small"> · {season.teams[String(r.team)]}</span>
            </h2>
            <div className="stat-row">
              <div className="highlight">
                <strong>{r.preAssists}</strong>
                <span>Pre-Assists (Platz {rank})</span>
              </div>
              <div>
                <strong>{r.assists}</strong>
                <span>Assists</span>
              </div>
              <div>
                <strong>{r.goals}</strong>
                <span>Tore</span>
              </div>
              <div>
                <strong>{r.minutes > 0 ? ((r.preAssists / r.minutes) * 90).toFixed(2).replace(".", ",") : "–"}</strong>
                <span>Pre-Assists / 90</span>
              </div>
              <div>
                <strong>{r.preAssistXg.toFixed(2).replace(".", ",")}</strong>
                <span>Pre-Assist xG</span>
              </div>
              <div>
                <strong>{r.minutes.toLocaleString("de-AT")}</strong>
                <span>Minuten · {r.matches} Spiele</span>
              </div>
            </div>

            {topPartners.length > 0 && (
              <p className="partners">
                Die Pre-Assists führten zu Toren von{" "}
                {topPartners.map(([id, n], i) => {
                  const slug = playerSlug(season, id);
                  const name = season.names[String(id)];
                  return (
                    <span key={id}>
                      {i > 0 && (i === topPartners.length - 1 ? " und " : ", ")}
                      {slug ? <Link href={`/spieler/${slug}/`}>{name}</Link> : name} ({n})
                    </span>
                  );
                })}
                .
              </p>
            )}

            {preGoals.length > 0 ? (
              <div className="grid goals">
                {preGoals.map((g) => (
                  <GoalCard key={g.id} season={season} goal={g} highlight={r.id} />
                ))}
              </div>
            ) : (
              <p className="muted">Keine Pre-Assists in dieser Saison.</p>
            )}
          </section>
        );
      })}
    </>
  );
}
