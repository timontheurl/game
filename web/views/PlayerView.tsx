import Link from "next/link";
import { notFound } from "next/navigation";
import CountUp from "@/components/CountUp";
import GoalCard from "@/components/GoalCard";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import PlayerInsights from "@/components/PlayerInsights";
import SeasonFilter from "@/components/SeasonFilter";
import ShareButton from "@/components/ShareButton";
import type { CardData } from "@/lib/cards";
import { getPlayer, playerSlug, seasonLabel, teamSlugs, type PlayerSeason } from "@/lib/data";
import { num, pick, t, url, type Lang, type TKey } from "@/lib/i18n";

const year = (e: PlayerSeason) => parseInt(e.season.meta.season, 10) || 0;

function StatTable({ rows, lang }: { rows: [TKey | string, number, number, string][]; lang: Lang }) {
  return (
    <dl className="stat-table">
      {rows.map(([k, v, d, suffix]) => (
        <div key={k}>
          <dt>{k.includes(".") ? t(lang, k as TKey) : k}</dt>
          <dd>
            <CountUp value={v} decimals={d} lang={lang} />
            {suffix}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Eine Saison im Detail: Kennzahlen, Partner, Karte, Pass-Arten, ähnliche Spieler, alle Spielzüge. */
function SeasonDetail({ entry, lang }: { entry: PlayerSeason; lang: Lang }) {
  const { season, row: r, preGoals } = entry;
  const team = season.teams[String(r.team)];
  const partners = new Map<number, number>();
  for (const g of preGoals) partners.set(g.scorer, (partners.get(g.scorer) ?? 0) + 1);
  const topPartners = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rank = season.players.filter((p) => p.preAssists > r.preAssists).length + 1;
  const per90v = r.minutes > 0 ? (r.preAssists / r.minutes) * 90 : 0;

  return (
    <div className="season-detail">
      <div className="season-head">
        <div>
          <h2 className="section-title">{seasonLabel(season.meta)}</h2>
          <div className="player-tags">
            <Link href={url(lang, "verein", teamSlugs(season)[String(r.team)])} className="tag">
              {team}
            </Link>
            <Link href={url(lang, "wettbewerb", season.meta.slug)} className="tag">
              {pick(lang, `Platz ${rank} in der Rangliste`, `Rank ${rank} in the ranking`)}
            </Link>
            {r.position && <span className="tag">{r.position}</span>}
          </div>
        </div>
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
            filename={`preassists-${r.slug}-${season.meta.slug}.png`}
            title={`${r.name} – Pre-Assists`}
            data={{
              name: r.name,
              team,
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
      </div>

      <div className="season-stats">
        <StatTable
          lang={lang}
          rows={[
            ["common.preAssists", r.preAssists, 0, ""],
            ["pl.pa90", per90v, 2, ""],
            ["pl.xpa", r.xpa, 2, ""],
            ["pl.chances", r.preChances, 0, ""],
            ["common.assists", r.assists, 0, ""],
            ["common.goals", r.goals, 0, ""],
            ["pl.apps", r.matches, 0, ""],
            ["common.minutes", r.minutes, 0, ""],
          ]}
        />
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
    </div>
  );
}

export default function PlayerView({ slug, lang }: { slug: string; lang: Lang }) {
  // Neueste Saison zuerst
  const entries = getPlayer(slug, lang).sort((a, b) => year(b) - year(a));
  if (entries.length === 0) notFound();

  const latest = entries[0];
  const sum = (f: (e: PlayerSeason) => number) => entries.reduce((n, e) => n + f(e), 0);
  const total = {
    pa: sum((e) => e.row.preAssists),
    ast: sum((e) => e.row.assists),
    goals: sum((e) => e.row.goals),
    xpa: sum((e) => e.row.xpa),
    inv: sum((e) => e.row.involvements),
    chances: sum((e) => e.row.preChances),
    apps: sum((e) => e.row.matches),
    minutes: sum((e) => e.row.minutes),
  };
  // Häufigste Position
  const positions = new Map<string, number>();
  for (const e of entries) if (e.row.position) positions.set(e.row.position, (positions.get(e.row.position) ?? 0) + e.row.matches);
  const position = [...positions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const r = latest.row;

  const card: CardData = {
    slug: r.slug,
    name: r.name,
    team: latest.season.teams[String(r.team)],
    position,
    country: r.country,
    countryName: r.countryName,
    preAssists: total.pa,
    assists: total.ast,
    goals: total.goals,
    involvements: total.inv,
    preAssistXg: sum((e) => e.row.preAssistXg),
    xpa: total.xpa,
    minutes: total.minutes,
    matches: total.apps,
    season: entries.length > 1 ? pick(lang, `${entries.length} Bewerbe`, `${entries.length} competitions`) : seasonLabel(latest.season.meta),
  };

  // Alle Teams des Spielers, ohne Doppelungen
  const teams = new Map<string, string>();
  for (const e of entries) {
    const id = String(e.row.team);
    teams.set(teamSlugs(e.season)[id], e.season.teams[id]);
  }
  // Startauswahl: die Saison mit den meisten Pre-Assists
  const best = [...entries].sort((a, b) => b.row.preAssists - a.row.preAssists || year(b) - year(a))[0];

  return (
    <>
      <section className="section">
        <div className="player-hero">
          <PlayerCard card={card} size="lg" lang={lang} />
          <div className="player-info">
            <h1 className="player-name">
              {r.name}
              {r.fullName !== r.name && <small>{r.fullName}</small>}
            </h1>
            <div className="player-tags">
              {r.country && (
                <span className="tag">
                  <Flag code={r.country} /> {r.countryName}
                </span>
              )}
              {position && <span className="tag">{position}</span>}
              {[...teams.entries()]
                .filter(([, name]) => name !== r.countryName)
                .map(([s, name]) => (
                  <Link key={s} href={url(lang, "verein", s)} className="tag">
                    {name}
                  </Link>
                ))}
            </div>
            {entries.length > 1 && (
              <p className="muted player-total-note">
                {pick(
                  lang,
                  `Gesamtwerte aus ${entries.length} Bewerben – Details je Saison weiter unten.`,
                  `Totals from ${entries.length} competitions – details per season below.`,
                )}
              </p>
            )}
            <StatTable
              lang={lang}
              rows={[
                ["common.preAssists", total.pa, 0, ""],
                ["pl.pa90", total.minutes > 0 ? (total.pa / total.minutes) * 90 : 0, 2, ""],
                ["pl.xpa", total.xpa, 2, ""],
                ["pl.chances", total.chances, 0, ""],
                ["common.assists", total.ast, 0, ""],
                ["common.goals", total.goals, 0, ""],
                ["pl.inv", total.inv, 0, ""],
                ["pl.apps", total.apps, 0, ""],
                ["common.minutes", total.minutes, 0, ""],
              ]}
            />
          </div>
        </div>
      </section>

      {entries.length > 1 && (
        <section className="section">
          <h2 className="section-title">{pick(lang, "Karriere", "Career")}</h2>
          <div className="table-wrap career">
            <table>
              <thead>
                <tr>
                  <th>{pick(lang, "Bewerb", "Competition")}</th>
                  <th className="hide-sm">{t(lang, "table.team")}</th>
                  <th className="num">PA</th>
                  <th className="num">{t(lang, "card.ast")}</th>
                  <th className="num">{t(lang, "card.goal")}</th>
                  <th className="num hide-sm">xPA</th>
                  <th className="num hide-sm">{t(lang, "card.apps")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.season.meta.slug}>
                    <td className="name">
                      <a href={`#s-${e.season.meta.slug}`}>{seasonLabel(e.season.meta)}</a>
                      <div className="sub show-sm">{e.season.teams[String(e.row.team)]}</div>
                    </td>
                    <td className="hide-sm muted">
                      <Link href={url(lang, "verein", teamSlugs(e.season)[String(e.row.team)])} className="team-link">
                        {e.season.teams[String(e.row.team)]}
                      </Link>
                    </td>
                    <td className="num sorted">{e.row.preAssists}</td>
                    <td className="num">{e.row.assists}</td>
                    <td className="num">{e.row.goals}</td>
                    <td className="num hide-sm">{num(lang, e.row.xpa, 2)}</td>
                    <td className="num hide-sm">{e.row.matches}</td>
                  </tr>
                ))}
                <tr className="career-total">
                  <td className="name">{pick(lang, "Gesamt", "Total")}</td>
                  <td className="hide-sm" />
                  <td className="num">{total.pa}</td>
                  <td className="num">{total.ast}</td>
                  <td className="num">{total.goals}</td>
                  <td className="num hide-sm">{num(lang, total.xpa, 2)}</td>
                  <td className="num hide-sm">{total.apps}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section">
        {entries.length > 1 && <h2 className="section-title">{pick(lang, "Details je Saison", "Details per season")}</h2>}
        <SeasonFilter
          lang={lang}
          initial={best.season.meta.slug}
          options={entries.map((e) => ({
            slug: e.season.meta.slug,
            competition: e.season.meta.name,
            season: e.season.meta.season,
          }))}
        >
          {entries.map((e) => (
            <SeasonDetail key={e.season.meta.slug} entry={e} lang={lang} />
          ))}
        </SeasonFilter>
      </section>
    </>
  );
}
