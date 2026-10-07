import Link from "next/link";
import { notFound } from "next/navigation";
import AssistIllustration from "@/components/AssistIllustration";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import { getLeagueStatuses, toCard } from "@/lib/data";
import { pick, t, url, type Lang } from "@/lib/i18n";
import { leagueText } from "@/lib/leagues";

export default function LeagueView({ leagueKey, lang }: { leagueKey: string; lang: Lang }) {
  const status = getLeagueStatuses(lang).find((s) => s.league.key === leagueKey);
  if (!status) notFound();
  const { league, seasons } = status;
  const text = leagueText(league, lang);

  return (
    <>
      <section className="banner">
        <div>
          <span className="banner-kicker">
            <Flag code={league.flag} /> {text.country}
          </span>
          <h1>{text.name}</h1>
        </div>
        <div className="banner-facts">
          {seasons.length > 0 ? (
            <span>
              <b>{seasons.length}</b> {t(lang, seasons.length === 1 ? "common.season" : "common.seasons")}
            </span>
          ) : (
            <span className="lt-badge">{t(lang, "common.dataSoon")}</span>
          )}
        </div>
      </section>

      {seasons.length === 0 ? (
        <section className="coming-soon">
          <div>
            <h2>{t(lang, "league.prep")}</h2>
            <p>{text.blurb}</p>
            <p className="muted">
              {pick(
                lang,
                `Für die ${text.name} gibt es noch keine frei verfügbaren Spieldaten mit jedem einzelnen Pass. Sobald die Daten angebunden sind, erscheinen hier automatisch Ranglisten, Spielerkarten, Vereinsseiten und alle Torketten – genau wie bei den Ligen, die schon live sind.`,
                `There is no freely available match data with every single pass for the ${text.name} yet. As soon as the data is connected, rankings, player cards, club pages and all goal chains will appear here automatically – just like for the leagues that are already live.`,
              )}
            </p>
            <Link href={url(lang, "ligen")} className="text-link">
              {t(lang, "league.allLeagues")}
            </Link>
          </div>
          <figure className="intro-figure">
            <AssistIllustration lang={lang} />
          </figure>
        </section>
      ) : (
        seasons.map((season) => (
          <section key={season.meta.slug} className="section">
            <div className="section-head">
              <h2 className="section-title">{t(lang, "league.seasonX", { s: season.meta.season })}</h2>
              <Link href={url(lang, "wettbewerb", season.meta.slug)} className="text-link">
                {t(lang, "league.rankingAll")}
              </Link>
            </div>
            {season.meta.coverage === "team" && (
              <p className="notice">{t(lang, "league.teamOnly", { team: season.meta.coverageTeam ?? "" })}</p>
            )}
            <div className="card-grid">
              {season.players.slice(0, 8).map((p) => (
                <PlayerCard key={p.id} card={toCard(season, p)} lang={lang} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
