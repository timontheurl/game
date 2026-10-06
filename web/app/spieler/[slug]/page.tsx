import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CountUp from "@/components/CountUp";
import GoalCard from "@/components/GoalCard";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import { countryNameDe } from "@/lib/cards";
import { getPlayer, getPlayerSlugs, playerSlug, seasonLabel, toCard } from "@/lib/data";

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

  return (
    <>
      {entries.map(({ season, row: r, preGoals }, idx) => {
        const partners = new Map<number, number>();
        for (const g of preGoals) partners.set(g.scorer, (partners.get(g.scorer) ?? 0) + 1);
        const topPartners = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const rank = season.players.filter((p) => p.preAssists > r.preAssists).length + 1;

        const per90v = r.minutes > 0 ? (r.preAssists / r.minutes) * 90 : 0;
        // [Bezeichnung, Wert, Nachkommastellen, Nachsatz]
        const rows: [string, number, number, string][] = [
          ["Pre-Assists", r.preAssists, 0, ""],
          ["Platz in der Liga", rank, 0, "."],
          ["Pre-Assists pro 90 Min.", per90v, 2, ""],
          ["Pre-Assist xG", r.preAssistXg, 2, ""],
          ["Assists", r.assists, 0, ""],
          ["Tore", r.goals, 0, ""],
          ["Torbeteiligungen", r.involvements, 0, ""],
          ["Einsätze", r.matches, 0, ""],
          ["Minuten", r.minutes, 0, ""],
        ];

        return (
          <section key={season.meta.slug} className="section">
            <div className="player-hero">
              <PlayerCard card={toCard(season, r)} size="lg" />
              <div className="player-info">
                {idx === 0 && (
                  <h1 className="player-name">
                    {r.name}
                    {r.fullName !== r.name && <small>{r.fullName}</small>}
                  </h1>
                )}
                <div className="player-tags">
                  <Link href={`/wettbewerb/${season.meta.slug}/`} className="tag">
                    {seasonLabel(season.meta)}
                  </Link>
                  <span className="tag">{season.teams[String(r.team)]}</span>
                  {r.position && <span className="tag">{r.position}</span>}
                  {r.country && (
                    <span className="tag">
                      <Flag code={r.country} /> {countryNameDe(r.country, r.countryName)}
                    </span>
                  )}
                </div>
                <dl className="stat-table">
                  {rows.map(([k, v, d, suffix]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>
                        <CountUp value={v} decimals={d} />
                        {suffix}
                      </dd>
                    </div>
                  ))}
                </dl>
                {topPartners.length > 0 && (
                  <div className="partners">
                    <h3>Pre-Assists landeten bei</h3>
                    <ul>
                      {topPartners.map(([id, n]) => {
                        const slug = playerSlug(season, id);
                        const name = season.names[String(id)];
                        return (
                          <li key={id}>
                            {slug ? <Link href={`/spieler/${slug}/`}>{name}</Link> : name}
                            <b>{n}</b>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {preGoals.length > 0 && (
              <>
                <h2 className="section-title">Alle Pre-Assists {seasonLabel(season.meta)}</h2>
                <div className="goal-grid">
                  {preGoals.map((g) => (
                    <GoalCard key={g.id} season={season} goal={g} highlight={r.id} />
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
