import Link from "next/link";
import AssistIllustration from "@/components/AssistIllustration";
import DailyChain from "@/components/DailyChain";
import Newsletter from "@/components/Newsletter";
import PlayerCard from "@/components/PlayerCard";
import { dailyCandidates, getSeasons, seasonLabel, toCard, type PlayerRow, type Season } from "@/lib/data";
import { num, pick, t, url, type Lang } from "@/lib/i18n";

function joinNames(names: string[], lang: Lang) {
  const and = pick(lang, " und ", " and ");
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")}${and}${names[names.length - 1]}`;
}

/** Kurzer Text zur Spitze der Rangliste, aus den Daten erzeugt. */
function leagueText(season: Season, top: PlayerRow[], lang: Lang) {
  const { meta } = season;
  const team = (p: PlayerRow) => season.teams[String(p.team)];
  const best = top[0];
  const leaders = top.filter((p) => p.preAssists === best.preAssists);
  const share = meta.goals ? Math.round((meta.preAssists / meta.goals) * 100) : 0;
  const names = (list: string[]) => joinNames(list, lang);

  let lead: string;
  if (leaders.length > 1) {
    lead = pick(
      lang,
      `${names(leaders.map((p) => p.name))} teilen sich die Spitze mit je ${best.preAssists} Pre-Assists.`,
      `${names(leaders.map((p) => p.name))} share the lead with ${best.preAssists} pre-assists each.`,
    );
  } else {
    const extra =
      best.assists === 0
        ? pick(lang, " – und das ganz ohne eigenen Assist.", " – without a single assist of their own.")
        : best.assists < best.preAssists
          ? pick(lang, `, mehr als Assists (${best.assists}).`, `, more than assists (${best.assists}).`)
          : pick(lang, `, dazu kommen ${best.assists} Assists.`, `, plus ${best.assists} assists.`);
    lead = pick(
      lang,
      `${best.name} (${team(best)}) führt mit ${best.preAssists} Pre-Assists${extra}`,
      `${best.name} (${team(best)}) leads with ${best.preAssists} pre-assists${extra}`,
    );
  }

  const rest = top.filter((p) => !leaders.includes(p));
  const follow = rest.length
    ? `${pick(lang, "Dahinter", "Behind")}: ${names(rest.map((p) => `${p.name} (${p.preAssists})`))}.`
    : "";

  const context =
    meta.coverage === "team"
      ? pick(
          lang,
          `Ausgewertet sind die ${meta.matches} Spiele von ${meta.coverageTeam}. Bei ${share} % der Tore in diesen Spielen gab es einen Pre-Assist.`,
          `Covers the ${meta.matches} matches of ${meta.coverageTeam}. ${share}% of the goals in these matches had a pre-assist.`,
        )
      : pick(
          lang,
          `In ${meta.matches} Spielen fielen ${num(lang, meta.goals)} Tore. Bei ${share} % davon gab es einen Pre-Assist.`,
          `${num(lang, meta.goals)} goals were scored in ${meta.matches} matches. ${share}% of them had a pre-assist.`,
        );

  return { lead, follow, context };
}

export default function HomeView({ lang }: { lang: Lang }) {
  const seasons = getSeasons(lang);

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

      {seasons
        .filter((s) => !s.meta.national)
        .map((season, i) => {
          const top = season.players.slice(0, 3);
          if (top.length === 0) return null;
          const text = leagueText(season, top, lang);
          return (
            <section key={season.meta.slug} className={`league-row ${i % 2 ? "is-reversed" : ""}`}>
              <div className="league-box">
                {top.map((p) => (
                  <PlayerCard key={p.id} card={toCard(season, p)} lang={lang} />
                ))}
              </div>
              <div className="league-text">
                <span className="league-kicker">
                  {t(lang, "home.top3")} · {season.meta.country}
                </span>
                <h2>{seasonLabel(season.meta)}</h2>
                <p className="league-lead">{text.lead}</p>
                {text.follow && <p>{text.follow}</p>}
                <p className="muted">{text.context}</p>
                <Link href={url(lang, "wettbewerb", season.meta.slug)} className="text-link">
                  {t(lang, "common.fullRanking")}
                </Link>
              </div>
            </section>
          );
        })}

      <section className="section">
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

      <section className="section tournaments">
        <h2 className="section-title">{t(lang, "home.tournaments")}</h2>
        <div className="league-grid">
          {seasons
            .filter((s) => s.meta.national)
            .map((s) => {
              const top = s.players[0];
              return (
                <Link key={s.meta.slug} href={url(lang, "wettbewerb", s.meta.slug)} className="league-tile is-live">
                  <span className="lt-name">{seasonLabel(s.meta)}</span>
                  <span className="lt-country">{s.meta.country}</span>
                  {top && (
                    <span className="lt-leader">
                      {t(lang, "common.top")}: <b>{top.name}</b> · {top.preAssists} {t(lang, "common.preAssists")}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </section>

      <Newsletter lang={lang} />
    </>
  );
}
