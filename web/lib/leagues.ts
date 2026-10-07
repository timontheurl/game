import type { Lang } from "./i18n";

// Verzeichnis aller Ligen – auch der, für die es noch keine Daten gibt.
// Eine Liga gilt als "live", sobald die Pipeline eine Saison mit passendem Slug-Präfix liefert
// (z. B. "serie-a-2024-25" für key "serie-a").

export interface League {
  key: string;
  name: string;
  country: string;
  flag: string; // Code für flag-icons
  tier: "top5" | "europa" | "weitere" | "turnier" | "frauen";
  blurb: string;
  en: { name: string; country: string; blurb: string };
}

export const LEAGUES: League[] = [
  {
    key: "bundesliga",
    name: "Bundesliga",
    country: "Deutschland",
    flag: "de",
    tier: "top5",
    blurb: "Pressing, schnelles Umschalten und viele Tore aus der Tiefe.",
    en: { name: "Bundesliga", country: "Germany", blurb: "Pressing, quick transitions and plenty of goals from deep." },
  },
  {
    key: "premier-league",
    name: "Premier League",
    country: "England",
    flag: "gb-eng",
    tier: "top5",
    blurb: "Die Liga mit dem höchsten Tempo – und den meisten Steckpässen ins Zentrum.",
    en: { name: "Premier League", country: "England", blurb: "The league with the highest tempo – and the most through balls into the middle." },
  },
  {
    key: "la-liga",
    name: "La Liga",
    country: "Spanien",
    flag: "es",
    tier: "top5",
    blurb: "Ballbesitz und Kombinationen: Hier entstehen Tore oft über drei, vier Stationen.",
    en: { name: "La Liga", country: "Spain", blurb: "Possession and combinations: goals here often travel through three or four players." },
  },
  {
    key: "serie-a",
    name: "Serie A",
    country: "Italien",
    flag: "it",
    tier: "top5",
    blurb: "Taktisch, geduldig, präzise – der vorletzte Pass entscheidet hier besonders oft.",
    en: { name: "Serie A", country: "Italy", blurb: "Tactical, patient, precise – the penultimate pass decides a lot here." },
  },
  {
    key: "ligue-1",
    name: "Ligue 1",
    country: "Frankreich",
    flag: "fr",
    tier: "top5",
    blurb: "Athletik und Dribblings – spannend, wie oft der Pre-Assist dort ein Lauf ins Tiefe ist.",
    en: { name: "Ligue 1", country: "France", blurb: "Athleticism and dribbling – how often is the pre-assist a run in behind?" },
  },
  {
    key: "oesterreich-bundesliga",
    name: "Österreichische Bundesliga",
    country: "Österreich",
    flag: "at",
    tier: "weitere",
    blurb: "Unsere Heimliga. Sobald Daten verfügbar sind, ist sie die erste, die dazukommt.",
    en: { name: "Austrian Bundesliga", country: "Austria", blurb: "Our home league. As soon as data is available, it is the first one to be added." },
  },
  {
    key: "2-bundesliga",
    name: "2. Bundesliga",
    country: "Deutschland",
    flag: "de",
    tier: "weitere",
    blurb: "Die Talentschmiede – wer hier Pre-Assists sammelt, ist oft bald eine Liga höher.",
    en: { name: "2. Bundesliga", country: "Germany", blurb: "The talent factory – whoever collects pre-assists here is often a league higher soon." },
  },
  {
    key: "eredivisie",
    name: "Eredivisie",
    country: "Niederlande",
    flag: "nl",
    tier: "weitere",
    blurb: "Offensivfußball mit vielen Toren – ideal für lange Passketten.",
    en: { name: "Eredivisie", country: "Netherlands", blurb: "Attacking football with lots of goals – ideal for long passing chains." },
  },
  {
    key: "frauen-bundesliga",
    name: "Frauen-Bundesliga",
    country: "Deutschland",
    flag: "de",
    tier: "frauen",
    blurb: "Die stärkste Frauenliga Europas – mit Spielmacherinnen, die in keiner Scorerliste auftauchen.",
    en: { name: "Frauen-Bundesliga", country: "Germany", blurb: "Europe's strongest women's league – with playmakers who never appear on a scoring chart." },
  },
  {
    key: "wm",
    name: "Weltmeisterschaft",
    country: "International",
    flag: "un",
    tier: "turnier",
    blurb: "Die besten Nationalteams der Welt: Wer bereitet bei der WM die Tore vor?",
    en: { name: "World Cup", country: "International", blurb: "The best national teams in the world: who sets up the goals at the World Cup?" },
  },
  {
    key: "em",
    name: "Europameisterschaft",
    country: "Europa",
    flag: "eu",
    tier: "turnier",
    blurb: "Europas Nationalteams im Turniermodus – kurze Phase, jeder Pass zählt.",
    en: { name: "European Championship", country: "Europe", blurb: "Europe's national teams in tournament mode – short and every pass counts." },
  },
  {
    key: "frauen-wm",
    name: "Frauen-WM",
    country: "International",
    flag: "un",
    tier: "turnier",
    blurb: "Die Weltmeisterschaft der Frauen: Spielzüge der besten Nationalteams.",
    en: { name: "Women's World Cup", country: "International", blurb: "The Women's World Cup: moves from the best national teams." },
  },
  {
    key: "champions-league",
    name: "Champions League",
    country: "Europa",
    flag: "eu",
    tier: "europa",
    blurb: "Die besten Spielmacher Europas im direkten Vergleich.",
    en: { name: "Champions League", country: "Europe", blurb: "Europe's best playmakers head to head." },
  },
];

export function leagueForSeason(seasonSlug: string): League | undefined {
  // Saison-Slugs haben die Form "<liga>-<jahr>-<jahr>", z. B. "la-liga-2015-16"
  return LEAGUES.find((l) => seasonSlug.startsWith(`${l.key}-`) && /^\d/.test(seasonSlug.slice(l.key.length + 1)));
}

export function getLeague(key: string): League | undefined {
  return LEAGUES.find((l) => l.key === key);
}

/** Name, Land und Kurztext einer Liga in der gewünschten Sprache. */
export function leagueText(league: League, lang: Lang) {
  return lang === "en" ? league.en : { name: league.name, country: league.country, blurb: league.blurb };
}
