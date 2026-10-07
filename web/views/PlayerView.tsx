import Link from "next/link";
import { notFound } from "next/navigation";
import CountUp from "@/components/CountUp";
import GoalCard from "@/components/GoalCard";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import PlayerInsights from "@/components/PlayerInsights";
import ShareButton from "@/components/ShareButton";
import { getPlayer, playerSlug, seasonLabel, teamSlugs, toCard } from "@/lib/data";
import { t, url, type Lang, type TKey } from "@/lib/i18n";

export default function PlayerView({ slug, lang }: { slug: string; lang: Lang }) {
  const entries = getPlayer(slug, lang);
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
        const rows: [TKey, number, number, string][] = [
          ["common.preAssists", r.preAssists, 0, ""],
          ["pl.rank", rank, 0, lang === "de" ? "." : ""],
          ["pl.pa90", per90v, 2, ""],
          ["pl.xpa", r.xpa, 2, ""],
          ["pl.chances", r.preChances, 0, ""],
          ["common.assists", r.assists, 0, ""],
          ["common.goals", r.goals, 0, ""],
          ["pl.inv", r.involvements, 0, ""],
          ["pl.apps", r.matches, 0, ""],
          ["common.minutes", r.minutes, 0, ""],
        ];

        return (
          <section key={season.meta.slug} className="section">
            <div className="player-hero">
              <PlayerCard card={toCard(season, r)} size="lg" lang={lang} />
              <div className="player-info">
                {idx === 0 && (
                  <h1 className="player-name">
                    {r.name}
                    {r.fullName !== r.name && <small>{r.fullName}</small>}
                  </h1>
                )}
                <div className="player-tags">
                  <Link href={url(lang, "wettbewerb", season.meta.slug)} className="tag">
                    {seasonLabel(season.meta)}
                  </Link>
                  <Link href={url(lang, "verein", teamSlugs(season)[String(r.team)])} className="tag">
                    {season.teams[String(r.team)]}
                  </Link>
                  {r.position && <span className="tag">{r.position}</span>}
                  {r.country && (
                    <span className="tag">
                      <Flag code={r.country} /> {r.countryName}
                    </span>
                  )}
                </div>
                <dl className="stat-table">
                  {rows.map(([k, v, d, suffix]) => (
                    <div key={k}>
                      <dt>{t(lang, k)}</dt>
                      <dd>
                        <CountUp value={v} decimals={d} lang={lang} />
                        {suffix}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="player-actions">
                  <Link
                    href={`${url(lang, "vergleich")}?a=${encodeURIComponent(`${r.slug}|${season.meta.slug}`)}`}
                    className="btn btn-ghost btn-small"
                  >
                    {t(lang, "pl.compare")}
                  </Link>
                  <ShareButton
                    kind="player"
                    small
                    lang={lang}
                    filename={`preassists-${r.slug}.png`}
                    title={`${r.name} – Pre-Assists`}
                    data={{
                      name: r.name,
                      team: season.teams[String(r.team)],
                      season: seasonLabel(season.meta),
                      position: r.position,
                      preAssists: r.preAssists,
                      assists: r.assists,
                      goals: r.goals,
                      xpa: r.xpa,
                      rank,
                    }}
                  />
                </div>
                {topPartners.length > 0 && (
                  <div className="partners">
                    <h3>{t(lang, "pl.partners")}</h3>
                    <ul>
                      {topPartners.map(([id, n]) => {
                        const partner = playerSlug(season, id);
                        const name = season.names[String(id)];
                        return (
                          <li key={id}>
                            {partner ? <Link href={url(lang, "spieler", partner)}>{name}</Link> : name}
                            <b>{n}</b>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <PlayerInsights season={season} row={r} goals={preGoals} lang={lang} />

            {preGoals.length > 0 && (
              <>
                <h2 className="section-title">{t(lang, "pl.all", { season: seasonLabel(season.meta) })}</h2>
                <div className="goal-grid">
                  {preGoals.map((g) => (
                    <GoalCard key={g.id} season={season} goal={g} highlight={r.id} lang={lang} />
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
