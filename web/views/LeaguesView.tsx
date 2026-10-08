import Link from "next/link";
import CountUp from "@/components/CountUp";
import { Flag } from "@/components/PlayerCard";
import { getLeagueStatuses, type LeagueStatus } from "@/lib/data";
import { pick, t, url, type Lang } from "@/lib/i18n";
import { leagueText } from "@/lib/leagues";

function LiveTile({ status: { league, seasons }, lang }: { status: LeagueStatus; lang: Lang }) {
  const goals = seasons.reduce((n, s) => n + s.meta.goals, 0);
  const pre = seasons.reduce((n, s) => n + s.meta.preAssists, 0);
  const leader = seasons[0].players[0];
  const text = leagueText(league, lang);
  return (
    <Link href={url(lang, "liga", league.key)} className="league-tile is-live reveal">
      <span className="lt-head">
        <Flag code={league.flag} title={text.country} />
        <span className="lt-badge live">{t(lang, "common.live")}</span>
      </span>
      <span className="lt-name">{text.name}</span>
      <span className="lt-country">{text.country}</span>
      <span className="lt-facts">
        <span>
          <b>{seasons.length}</b> {t(lang, seasons.length === 1 ? "common.season" : "common.seasons")}
        </span>
        <span>
          <b>
            <CountUp value={goals} lang={lang} />
          </b>{" "}
          {t(lang, "common.goals")}
        </span>
        <span>
          <b>
            <CountUp value={pre} lang={lang} />
          </b>{" "}
          {t(lang, "common.preAssists")}
        </span>
      </span>
      {leader && (
        <span className="lt-leader">
          {t(lang, "common.top")}: <b>{leader.name}</b> · {leader.preAssists}
        </span>
      )}
    </Link>
  );
}

export default function LeaguesView({ lang }: { lang: Lang }) {
  const statuses = getLeagueStatuses(lang);
  const live = statuses.filter((s) => s.seasons.length > 0 && s.league.tier !== "turnier");
  const tournaments = statuses.filter((s) => s.seasons.length > 0 && s.league.tier === "turnier");
  const planned = statuses.filter((s) => s.seasons.length === 0);

  return (
    <>
      <section className="page-intro">
        <h1>{t(lang, "nav.leagues")}</h1>
        <p>
          {pick(
            lang,
            `${live.length} Ligen und ${tournaments.length} Turniere mit Pre-Assist-Daten, ${planned.length} weitere in Vorbereitung. Jede Liga bekommt Ranglisten, Vereinsseiten und alle Torketten.`,
            `${live.length} leagues and ${tournaments.length} tournaments with pre-assist data, ${planned.length} more in preparation. Every league gets rankings, club pages and all goal chains.`,
          )}
        </p>
      </section>

      <section className="section" id="ligen">
        <h2 className="section-title">{pick(lang, "Ligen", "Leagues")}</h2>
        <div className="league-grid">
          {live.map((s) => (
            <LiveTile key={s.league.key} status={s} lang={lang} />
          ))}
        </div>
      </section>

      <section className="section" id="turniere">
        <h2 className="section-title">{t(lang, "home.tournaments")}</h2>
        <div className="league-grid">
          {tournaments.map((s) => (
            <LiveTile key={s.league.key} status={s} lang={lang} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{pick(lang, "Bald dabei", "Coming soon")}</h2>
        <div className="league-grid">
          {planned.map(({ league }) => {
            const text = leagueText(league, lang);
            return (
              <Link key={league.key} href={url(lang, "liga", league.key)} className="league-tile is-planned reveal">
                <span className="lt-head">
                  <Flag code={league.flag} title={text.country} />
                  <span className="lt-badge">{t(lang, "common.dataSoon")}</span>
                </span>
                <span className="lt-name">{text.name}</span>
                <span className="lt-country">{text.country}</span>
                <span className="lt-blurb">{text.blurb}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
