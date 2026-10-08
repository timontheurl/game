import Link from "next/link";
import AssistIllustration from "@/components/AssistIllustration";
import DailyChain from "@/components/DailyChain";
import Newsletter from "@/components/Newsletter";
import PlayerCard, { Flag } from "@/components/PlayerCard";
import { dailyCandidates, getLeagueStatuses, getSeasons, seasonLabel, toCard, type LeagueStatus } from "@/lib/data";
import { num, pick, t, url, type Lang } from "@/lib/i18n";
import { leagueText } from "@/lib/leagues";

/** Die besten Vorbereiter einer Saison über alle Ligen (ohne Turniere). */
function topOverall(lang: Lang, limit = 3) {
  return getSeasons(lang)
    .filter((s) => !s.meta.national)
    .flatMap((season) => season.players.map((row) => ({ season, row })))
    .sort(
      (a, b) =>
        b.row.preAssists - a.row.preAssists || b.row.xpa - a.row.xpa || b.row.involvements - a.row.involvements,
    )
    .slice(0, limit);
}

function CompetitionList({ title, statuses, lang }: { title: string; statuses: LeagueStatus[]; lang: Lang }) {
  return (
    <div className="comp-col">
      <h3 className="sub-title">{title}</h3>
      <ul className="comp-list">
        {statuses.map(({ league, seasons }) => {
          const text = leagueText(league, lang);
          const leader = seasons[0]?.players[0];
          return (
            <li key={league.key}>
              <Link href={url(lang, "liga", league.key)} className={seasons.length ? "" : "is-planned"}>
                <Flag code={league.flag} title={text.country} />
                <span className="comp-name">
                  {text.name}
                  <small>
                    {seasons.length
                      ? seasons.map((s) => s.meta.season).join(", ")
                      : t(lang, "common.dataSoon")}
                  </small>
                </span>
                {leader && (
                  <span className="comp-leader">
                    {leader.name} <b>{leader.preAssists}</b>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function HomeView({ lang }: { lang: Lang }) {
  const top = topOverall(lang);
  const statuses = getLeagueStatuses(lang);
  const leagues = statuses.filter((s) => s.league.tier !== "turnier");
  // Ligen mit Daten zuerst
  leagues.sort((a, b) => Number(b.seasons.length > 0) - Number(a.seasons.length > 0));
  const tournaments = statuses.filter((s) => s.league.tier === "turnier" && s.seasons.length > 0);
  const [first, ...rest] = top;
  const totalPre = getSeasons(lang)
    .filter((s) => !s.meta.national)
    .reduce((n, s) => n + s.meta.preAssists, 0);

  return (
    <>
      <section className="intro">
        {lang === "de" ? (
          <div className="intro-text">
            <h1>
              Jedes Tor hat eine <span>Vorgeschichte.</span>
            </h1>
            <p className="intro-lead">
              Der Torschütze bekommt die Schlagzeile, der Vorlagengeber die Erwähnung. Das Entscheidende passiert aber
              oft einen Pass früher: der Steckpass, der die Abwehrkette aufreißt, bevor der Querleger zum Tor kommt.
            </p>
            <p>
              Dieser Pass vor dem Assist ist der <strong>Pre-Assist</strong>. Ohne ihn gibt es keine Torvorlage und kein
              Tor – trotzdem taucht er in keiner gängigen Statistik auf. Hier zählen wir ihn: für jedes Tor, jeden
              Spieler und jede Liga.
            </p>
            <Link href={url(lang, "methodik")} className="text-link">
              {t(lang, "home.method")}
            </Link>
          </div>
        ) : (
          <div className="intro-text">
            <h1>
              Every goal has a <span>backstory.</span>
            </h1>
            <p className="intro-lead">
              The scorer gets the headline, the assist provider gets a mention. But the decisive moment often happens
              one pass earlier: the through ball that splits the back line before the square pass sets up the goal.
            </p>
            <p>
              That pass before the assist is the <strong>pre-assist</strong>. Without it there is no assist and no goal
              – yet it doesn&apos;t appear in any of the usual stats. We count it here: for every goal, every player and
              every league.
            </p>
            <Link href={url(lang, "methodik")} className="text-link">
              {t(lang, "home.method")}
            </Link>
          </div>
        )}
        <figure className="intro-figure">
          <AssistIllustration lang={lang} />
        </figure>
      </section>

      {first && (
        <section className="league-row">
          <div className="league-box">
            {top.map(({ season, row }) => (
              <PlayerCard key={`${season.meta.slug}-${row.id}`} card={toCard(season, row)} lang={lang} />
            ))}
          </div>
          <div className="league-text">
            <span className="league-kicker">{pick(lang, "Top 3 · alle Ligen", "Top 3 · all leagues")}</span>
            <h2>{pick(lang, "Die besten Vorbereiter", "The best creators")}</h2>
            <p className="league-lead">
              {pick(
                lang,
                `${first.row.name} (${first.season.teams[String(first.row.team)]}) hat mit ${first.row.preAssists} Pre-Assists in der ${seasonLabel(first.season.meta)} den Bestwert aller Ligen.`,
                `${first.row.name} (${first.season.teams[String(first.row.team)]}) holds the best mark across all leagues with ${first.row.preAssists} pre-assists in ${seasonLabel(first.season.meta)}.`,
              )}
            </p>
            {rest.length > 0 && (
              <p>
                {pick(lang, "Dahinter", "Behind")}:{" "}
                {rest
                  .map(({ season, row }) => `${row.name} (${row.preAssists}, ${seasonLabel(season.meta)})`)
                  .join(pick(lang, " und ", " and "))}
                .
              </p>
            )}
            <p className="muted">
              {pick(
                lang,
                `Insgesamt ${num(lang, totalPre)} Pre-Assists in allen ausgewerteten Ligen.`,
                `${num(lang, totalPre)} pre-assists in all covered leagues.`,
              )}
            </p>
            <Link href={url(lang, "rekorde")} className="text-link">
              {pick(lang, "Alle Rekorde", "All records")}
            </Link>
          </div>
        </section>
      )}

      <section className="section daily-section">
        <div className="section-head">
          <h2 className="section-title">{t(lang, "home.daily")}</h2>
          <span className="muted small">
            {pick(
              lang,
              "Jeden Tag ein anderer Angriff – vom Pre-Assist bis zum Tor.",
              "A different attack every day – from the pre-assist to the goal.",
            )}
          </span>
        </div>
        <DailyChain candidates={dailyCandidates(lang)} lang={lang} />
      </section>

      <section className="section game-teaser">
        <div>
          <span className="league-kicker">{t(lang, "nav.game")}</span>
          <h2>{pick(lang, "Mehr oder weniger?", "Higher or lower?")}</h2>
          <p className="muted">
            {pick(
              lang,
              "Zwei Spieler, eine Frage: Wer hatte mehr Pre-Assists? Liegst du richtig, kommt der nächste – wie lang wird deine Serie?",
              "Two players, one question: who had more pre-assists? Get it right and the next one comes in – how long can your streak get?",
            )}
          </p>
        </div>
        <div className="player-actions">
          <Link href={url(lang, "spiel")} className="btn">
            {pick(lang, "Jetzt spielen", "Play now")}
          </Link>
          <Link href={`${url(lang, "spiel")}?modus=raten`} className="btn btn-ghost">
            {pick(lang, "Spieler erraten", "Guess the player")}
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t(lang, "nav.leagues")}</h2>
          <Link href={url(lang, "ligen")} className="text-link">
            {pick(lang, "Alle Bewerbe", "All competitions")}
          </Link>
        </div>
        <div className="comp-columns">
          <CompetitionList title={pick(lang, "Ligen", "Leagues")} statuses={leagues} lang={lang} />
          <CompetitionList title={t(lang, "home.tournaments")} statuses={tournaments} lang={lang} />
        </div>
      </section>

      <Newsletter lang={lang} />
    </>
  );
}
