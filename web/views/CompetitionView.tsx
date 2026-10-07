import Link from "next/link";
import { notFound } from "next/navigation";
import ClubTile from "@/components/ClubTile";
import CountUp from "@/components/CountUp";
import PlayerCard from "@/components/PlayerCard";
import RankingTable from "@/components/RankingTable";
import {
  getSeason,
  playerSlug,
  seasonClubs,
  seasonLabel,
  teamSlugs,
  toCard,
  topCombos,
  type Season,
} from "@/lib/data";
import { t, url, type Lang } from "@/lib/i18n";

function Name({ season, id, lang }: { season: Season; id: number; lang: Lang }) {
  const slug = playerSlug(season, id);
  const name = season.names[String(id)];
  return slug ? <Link href={url(lang, "spieler", slug)}>{name}</Link> : <span>{name}</span>;
}

export default function CompetitionView({ slug, lang }: { slug: string; lang: Lang }) {
  const season = getSeason(slug, lang);
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
              <CountUp value={meta.matches} lang={lang} />
            </b>{" "}
            {t(lang, "common.matches")}
          </span>
          <span>
            <b>
              <CountUp value={meta.goals} lang={lang} />
            </b>{" "}
            {t(lang, "common.goals")}
          </span>
          <span>
            <b>
              <CountUp value={meta.preAssists} lang={lang} />
            </b>{" "}
            {t(lang, "common.withPre")}
          </span>
        </div>
      </section>

      {meta.manual && <p className="notice">{t(lang, "comp.manual")}</p>}

      {meta.coverage === "team" && (
        <p className="notice">{t(lang, "comp.teamOnly", { team: meta.coverageTeam ?? "" })}</p>
      )}

      <section className="section">
        <h2 className="section-title">{t(lang, "comp.top8")}</h2>
        <div className="card-grid">
          {season.players.slice(0, 8).map((p) => (
            <PlayerCard key={p.id} card={toCard(season, p)} lang={lang} />
          ))}
        </div>
      </section>

      {meta.coverage === "full" && (
        <section className="section">
          <h2 className="section-title">{t(lang, meta.national ? "common.nationalTeams" : "common.clubs")}</h2>
          <div className="club-grid">
            {seasonClubs(season, lang).map((c, i) => (
              <ClubTile key={c.club.slug} {...c} rank={i + 1} lang={lang} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">{t(lang, "common.allPlayers")}</h2>
        <RankingTable players={season.players} teams={season.teams} teamSlugs={teamSlugs(season)} lang={lang} />
      </section>

      {combos.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t(lang, "common.mostChains")}</h2>
          <ul className="combo-list">
            {combos.map((c) => (
              <li key={`${c.pre}-${c.assist}-${c.scorer}`}>
                <b className="pl-count">{c.count}×</b>
                <span className="chain-names">
                  <span className="c-pre">
                    <Name season={season} id={c.pre} lang={lang} />
                  </span>
                  <span className="c-sep">›</span>
                  <span className="c-ast">
                    <Name season={season} id={c.assist} lang={lang} />
                  </span>
                  <span className="c-sep">›</span>
                  <span className="c-goal">
                    <Name season={season} id={c.scorer} lang={lang} />
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
