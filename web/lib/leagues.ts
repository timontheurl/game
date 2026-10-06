// Verzeichnis aller Ligen – auch der, für die es noch keine Daten gibt.
// Eine Liga gilt als "live", sobald die Pipeline eine Saison mit passendem Slug-Präfix liefert
// (z. B. "serie-a-2024-25" für key "serie-a").

export interface League {
  key: string;
  name: string;
  country: string;
  flag: string; // Code für flag-icons
  tier: "top5" | "europa" | "weitere";
  blurb: string;
}

export const LEAGUES: League[] = [
  {
    key: "bundesliga",
    name: "Bundesliga",
    country: "Deutschland",
    flag: "de",
    tier: "top5",
    blurb: "Pressing, schnelles Umschalten und viele Tore aus der Tiefe.",
  },
  {
    key: "premier-league",
    name: "Premier League",
    country: "England",
    flag: "gb-eng",
    tier: "top5",
    blurb: "Die Liga mit dem höchsten Tempo – und den meisten Steckpässen ins Zentrum.",
  },
  {
    key: "la-liga",
    name: "La Liga",
    country: "Spanien",
    flag: "es",
    tier: "top5",
    blurb: "Ballbesitz und Kombinationen: Hier entstehen Tore oft über drei, vier Stationen.",
  },
  {
    key: "serie-a",
    name: "Serie A",
    country: "Italien",
    flag: "it",
    tier: "top5",
    blurb: "Taktisch, geduldig, präzise – der vorletzte Pass entscheidet hier besonders oft.",
  },
  {
    key: "ligue-1",
    name: "Ligue 1",
    country: "Frankreich",
    flag: "fr",
    tier: "top5",
    blurb: "Athletik und Dribblings – spannend, wie oft der Pre-Assist dort ein Lauf ins Tiefe ist.",
  },
  {
    key: "oesterreich-bundesliga",
    name: "Österreichische Bundesliga",
    country: "Österreich",
    flag: "at",
    tier: "weitere",
    blurb: "Unsere Heimliga. Sobald Daten verfügbar sind, ist sie die erste, die dazukommt.",
  },
  {
    key: "2-bundesliga",
    name: "2. Bundesliga",
    country: "Deutschland",
    flag: "de",
    tier: "weitere",
    blurb: "Die Talentschmiede – wer hier Pre-Assists sammelt, ist oft bald eine Liga höher.",
  },
  {
    key: "eredivisie",
    name: "Eredivisie",
    country: "Niederlande",
    flag: "nl",
    tier: "weitere",
    blurb: "Offensivfußball mit vielen Toren – ideal für lange Passketten.",
  },
  {
    key: "champions-league",
    name: "Champions League",
    country: "Europa",
    flag: "eu",
    tier: "europa",
    blurb: "Die besten Spielmacher Europas im direkten Vergleich.",
  },
];

export function leagueForSeason(seasonSlug: string): League | undefined {
  // Saison-Slugs haben die Form "<liga>-<jahr>-<jahr>", z. B. "la-liga-2015-16"
  return LEAGUES.find((l) => seasonSlug.startsWith(`${l.key}-`) && /^\d/.test(seasonSlug.slice(l.key.length + 1)));
}

export function getLeague(key: string): League | undefined {
  return LEAGUES.find((l) => l.key === key);
}
