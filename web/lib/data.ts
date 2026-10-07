import fs from "node:fs";
import path from "node:path";
import { clubSlug, formatClock, type CardData } from "./cards";
import { competitionName, countryLabel, countryName, positionLabel, type Lang } from "./i18n";

export { describePass, formatClock } from "./cards";
import { LEAGUES, leagueForSeason, type League } from "./leagues";
import { loadManualSeasons } from "./manual";

export type { CardData } from "./cards";

export type Point = [number, number];

export interface PassInfo {
  player: number;
  start: Point;
  end: Point;
  height: string | null;
  type: string | null;
  technique: string | null;
  cross: boolean;
  through: boolean;
  cutback: boolean;
  minute: number;
  second: number;
}

export interface Goal {
  id: string;
  match: number;
  team: number;
  period: number;
  minute: number;
  second: number;
  scorer: number;
  xg: number;
  shot: { start: Point; end: Point | null; body: string | null; type: string | null };
  pattern: string;
  assist: PassInfo | null;
  pre: PassInfo | null;
}

export interface PlayerRow {
  id: number;
  slug: string;
  name: string;
  fullName: string;
  team: number;
  goals: number;
  assists: number;
  preAssists: number;
  involvements: number;
  preAssistXg: number;
  assistXg: number;
  /** Erwartete Pre-Assists: xG aller Abschlüsse nach eigenem Pre-Assist (auch ohne Tor) */
  xpa: number;
  /** Erwartete Assists: xG aller Abschlüsse nach eigener Vorlage */
  xa: number;
  /** Anzahl Abschlüsse nach eigenem Pre-Assist */
  preChances: number;
  minutes: number;
  matches: number;
  position: string | null;
  country: string | null;
  countryName: string | null;
}

export interface Match {
  id: number;
  date: string;
  week: number | null;
  home: number;
  away: number;
  home_score: number;
  away_score: number;
}

export interface SeasonMeta {
  slug: string;
  name: string;
  country: string;
  season: string;
  coverage: "full" | "team";
  coverageTeam: string | null;
  /** Turnier mit Nationalteams statt Vereinen */
  national: boolean;
  /** Händisch erfasst (ohne xG und Spielminuten) */
  manual?: boolean;
  matches: number;
  goals: number;
  assists: number;
  preAssists: number;
}

export interface Season {
  meta: SeasonMeta;
  teams: Record<string, string>;
  /** Nur bei Nationalteams: Flaggen-Code je Team */
  teamCodes: Record<string, { code: string; women: boolean }>;
  names: Record<string, string>;
  players: PlayerRow[];
  matches: Record<string, Match>;
  goals: Goal[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const cache: Partial<Record<Lang, Season[]>> = {};

function loadSeasons(): Season[] {
  const index: SeasonMeta[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "competitions.json"), "utf8"));
  const seasons = index.map((m) => {
    const season: Season = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "seasons", `${m.slug}.json`), "utf8"));
    season.teamCodes ??= {};
    return season;
  });
  // Händisch erfasste Saisons (Erfassungs-Tool) kommen dazu
  seasons.push(...loadManualSeasons());
  return seasons;
}

/** Saison in der gewünschten Sprache: Wettbewerbs-, Länder- und Nationalteam-Namen übersetzt. */
function localize(season: Season, lang: Lang): Season {
  const teams = { ...season.teams };
  // Nationalteams in der Landessprache der Seite; Frauenteams eindeutig kennzeichnen
  for (const [id, { code, women }] of Object.entries(season.teamCodes)) {
    const name = countryName(code, season.teams[id], lang) ?? season.teams[id];
    teams[id] = women ? `${name} (${lang === "en" ? "Women" : "Frauen"})` : name;
  }
  return {
    ...season,
    teams,
    meta: { ...season.meta, name: competitionName(season.meta.name, lang), country: countryLabel(season.meta.country, lang) },
    players: season.players.map((p) => ({
      ...p,
      countryName: countryName(p.country, p.countryName, lang),
      position: positionLabel(p.position, lang),
    })),
  };
}

let raw: Season[] | null = null;

export function getSeasons(lang: Lang = "de"): Season[] {
  raw ??= loadSeasons();
  return (cache[lang] ??= raw.map((s) => localize(s, lang)));
}

export function getSeason(slug: string, lang: Lang = "de"): Season | undefined {
  return getSeasons(lang).find((s) => s.meta.slug === slug);
}

/** Turniere (WM, EM) haben Nationalteams, Ligen haben Vereine. */
export function isTournament(meta: SeasonMeta): boolean {
  return meta.national;
}

export function seasonLabel(meta: SeasonMeta): string {
  return `${meta.name} ${meta.season}`;
}

export interface PlayerSeason {
  season: Season;
  row: PlayerRow;
  preGoals: Goal[];
}

export function getPlayerSlugs(): string[] {
  const slugs = new Set<string>();
  for (const s of getSeasons()) for (const p of s.players) slugs.add(p.slug);
  return [...slugs];
}

export function getPlayer(slug: string, lang: Lang = "de"): PlayerSeason[] {
  const result: PlayerSeason[] = [];
  for (const season of getSeasons(lang)) {
    const row = season.players.find((p) => p.slug === slug);
    if (!row) continue;
    const preGoals = season.goals.filter((g) => g.pre?.player === row.id);
    result.push({ season, row, preGoals });
  }
  return result;
}

export function playerSlug(season: Season, id: number): string | null {
  return season.players.find((p) => p.id === id)?.slug ?? null;
}

export interface Combo {
  pre: number;
  assist: number;
  scorer: number;
  count: number;
}

/** Häufigste Ketten Pre-Assist → Assist → Tor in einer Saison. */
export function topCombos(season: Season, limit = 8, teamId?: number): Combo[] {
  const map = new Map<string, Combo>();
  for (const g of season.goals) {
    if (teamId !== undefined && g.team !== teamId) continue;
    if (!g.pre || !g.assist) continue;
    const key = `${g.pre.player}-${g.assist.player}-${g.scorer}`;
    const c = map.get(key) ?? { pre: g.pre.player, assist: g.assist.player, scorer: g.scorer, count: 0 };
    c.count++;
    map.set(key, c);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function toCard(season: Season, row: PlayerRow): CardData {
  return {
    slug: row.slug,
    name: row.name,
    team: season.teams[String(row.team)],
    position: row.position,
    country: row.country,
    countryName: row.countryName,
    preAssists: row.preAssists,
    assists: row.assists,
    goals: row.goals,
    involvements: row.involvements,
    preAssistXg: row.preAssistXg,
    xpa: row.xpa,
    minutes: row.minutes,
    matches: row.matches,
    season: seasonLabel(season.meta),
  };
}

export interface LeagueStatus {
  league: League;
  seasons: Season[];
}

/** Alle Ligen mit ihren verfügbaren Saisons (leer = Daten folgen). */
export function getLeagueStatuses(lang: Lang = "de"): LeagueStatus[] {
  return LEAGUES.map((league) => ({
    league,
    seasons: getSeasons(lang).filter((s) => leagueForSeason(s.meta.slug)?.key === league.key),
  }));
}

export interface ClubSeason {
  season: Season;
  teamId: number;
  name: string;
  players: PlayerRow[];
  goals: Goal[];
}

export interface Club {
  slug: string;
  name: string;
  /** Flaggen-Code, wenn es ein Nationalteam ist */
  flag: string | null;
  seasons: ClubSeason[];
}

const clubCache: Partial<Record<Lang, Club[]>> = {};

/** Alle Vereine mit mindestens einem erfassten Spieler, über alle Saisons zusammengefasst. */
export function getClubs(lang: Lang = "de"): Club[] {
  if (clubCache[lang]) return clubCache[lang];
  const bySlug = new Map<string, Club>();
  const de = getSeasons("de");
  for (const [i, season] of getSeasons(lang).entries()) {
    const teamIds = new Set(season.players.map((p) => p.team));
    for (const teamId of teamIds) {
      const name = season.teams[String(teamId)];
      // Adresse immer aus dem deutschen Namen, damit beide Sprachen dieselben Slugs haben
      const slug = clubSlug(de[i].teams[String(teamId)]);
      const club = bySlug.get(slug) ?? { slug, name, flag: season.teamCodes?.[String(teamId)]?.code ?? null, seasons: [] };
      club.seasons.push({
        season,
        teamId,
        name,
        players: season.players.filter((p) => p.team === teamId),
        goals: season.goals.filter((g) => g.team === teamId),
      });
      bySlug.set(slug, club);
    }
  }
  clubCache[lang] = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, lang));
  return clubCache[lang];
}

export function getClub(slug: string, lang: Lang = "de"): Club | undefined {
  return getClubs(lang).find((c) => c.slug === slug);
}

/** Vereine einer Saison, sortiert nach Pre-Assists. */
export function seasonClubs(season: Season, lang: Lang = "de") {
  return getClubs(lang)
    .flatMap((c) => c.seasons.filter((cs) => cs.season === season).map((cs) => ({ club: c, cs })))
    .map(({ club, cs }) => ({
      club,
      goals: cs.goals.length,
      preAssists: cs.goals.filter((g) => g.pre).length,
      leader: [...cs.players].sort((a, b) => b.preAssists - a.preAssists)[0],
    }))
    .sort((a, b) => b.preAssists - a.preAssists || b.goals - a.goals);
}

/**
 * Kandidaten für den „Spielzug des Tages“: lange Ketten mit Pre-Assist aus der eigenen Hälfte oder dem
 * Mittelfeld – die schönsten Angriffe, quer durch alle vollständigen Wettbewerbe.
 */
export function dailyCandidates(lang: Lang = "de", limit = 120) {
  const len = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  return getSeasons(lang)
    .filter((s) => s.meta.coverage === "full" && !s.meta.manual)
    .flatMap((season) =>
      season.goals
        .filter((g) => g.pre && g.assist && g.pre.start[0] < 75)
        .map((g) => ({ season, g, score: len(g.pre!.start, g.pre!.end) + len(g.assist!.start, g.assist!.end) })),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ season, g }) => {
      const m = season.matches[String(g.match)];
      const ids = [g.pre!.player, g.assist!.player, g.scorer].map(String);
      const match = `${season.teams[String(m.home)]} ${m.home_score}:${m.away_score} ${season.teams[String(m.away)]}`;
      return {
        goal: g,
        names: Object.fromEntries(ids.map((id) => [id, season.names[id] ?? "–"])),
        slugs: Object.fromEntries(ids.map((id) => [id, playerSlug(season, Number(id)) ?? ""]).filter(([, s]) => s)),
        match,
        season: seasonLabel(season.meta),
        context: `${seasonLabel(season.meta)} · ${formatClock(g.period, g.minute)}`,
      };
    });
}

/** Vereins-Adresse je Team-ID – immer aus dem deutschen Namen, damit beide Sprachen dieselben Links haben. */
export function teamSlugs(season: Season): Record<string, string> {
  const de = getSeason(season.meta.slug, "de") ?? season;
  return Object.fromEntries(Object.entries(de.teams).map(([id, name]) => [id, clubSlug(name)]));
}
