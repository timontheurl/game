import ClubsExplorer, { type ExplorerCountry, type ExplorerLeague } from "@/components/ClubsExplorer";
import { getLeagueStatuses, seasonClubs, seasonLabel, type LeagueStatus } from "@/lib/data";
import { pick, t, type Lang } from "@/lib/i18n";
import { leagueText } from "@/lib/leagues";

// Länder der Weltkarte (ISO 3166-1 numerisch) zu den Flaggen der Ligen; England liegt im Vereinigten Königreich
const COUNTRY: Record<string, { iso: string; center: [number, number] }> = {
  de: { iso: "276", center: [10.4, 51.1] },
  "gb-eng": { iso: "826", center: [-1.6, 52.7] },
  es: { iso: "724", center: [-3.7, 40.3] },
  it: { iso: "380", center: [12.6, 42.9] },
  fr: { iso: "250", center: [2.4, 46.7] },
  at: { iso: "040", center: [14.6, 47.6] },
  nl: { iso: "528", center: [5.4, 52.2] },
  pt: { iso: "620", center: [-8.1, 39.6] },
  ch: { iso: "756", center: [8.2, 46.8] },
};

function toLeague({ league, seasons }: LeagueStatus, lang: Lang): ExplorerLeague {
  return {
    key: league.key,
    name: leagueText(league, lang).name,
    flag: league.flag,
    seasons: seasons
      .filter((s) => s.meta.coverage === "full" || s.players.length > 0)
      .map((season) => ({
        slug: season.meta.slug,
        label: season.meta.national ? seasonLabel(season.meta) : season.meta.season,
        clubs: seasonClubs(season, lang).map(({ club, goals, preAssists, leader }) => ({
          slug: club.slug,
          name: club.name,
          flag: club.flag,
          pre: preAssists,
          goals,
          leader: leader ? { name: leader.name, pa: leader.preAssists } : null,
        })),
      })),
  };
}

export default function ClubsView({ lang }: { lang: Lang }) {
  const statuses = getLeagueStatuses(lang);
  const byIso = new Map<string, ExplorerCountry>();
  for (const status of statuses) {
    const geo = COUNTRY[status.league.flag];
    if (!geo || status.league.tier === "turnier") continue;
    const { iso, center } = geo;
    const country = byIso.get(iso) ?? {
      iso,
      center,
      name: leagueText(status.league, lang).country,
      flag: status.league.flag,
      leagues: [],
    };
    country.leagues.push(toLeague(status, lang));
    byIso.set(iso, country);
  }
  // Länder mit Daten zuerst, innerhalb davon Ligen mit Daten zuerst
  const hasData = (l: ExplorerLeague) => l.seasons.length > 0;
  const countries = [...byIso.values()]
    .map((c) => ({ ...c, leagues: c.leagues.sort((a, b) => Number(hasData(b)) - Number(hasData(a))) }))
    .sort((a, b) => Number(b.leagues.some(hasData)) - Number(a.leagues.some(hasData)));
  const tournaments = statuses
    .filter((s) => s.league.tier === "turnier" && s.seasons.length > 0)
    .map((s) => toLeague(s, lang));

  return (
    <>
      <section className="page-intro">
        <h1>{t(lang, "nav.clubs")}</h1>
        <p>
          {pick(
            lang,
            "Welche Mannschaft spielt ihre Tore am häufigsten über zwei Stationen heraus? Land auf dem Globus wählen, Liga aufklappen – sortiert nach Pre-Assists.",
            "Which team creates its goals most often through two passes? Pick a country on the globe, open a league – sorted by pre-assists.",
          )}
        </p>
      </section>
      <section className="section">
        <ClubsExplorer countries={countries} tournaments={tournaments} lang={lang} />
      </section>
    </>
  );
}
