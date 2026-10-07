import fs from "node:fs";
import path from "node:path";
import { clubSlug, countryNameDe, type CardData } from "./cards";

export { describePass, formatClock } from "./cards";
import { LEAGUES, leagueForSeason, type League } from "./leagues";

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
let cache: Season[] | null = null;

export function getSeasons(): Season[] {
  if (!cache) {
    const index: SeasonMeta[] = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "competitions.json"), "utf8"),
    );
    cache = index.map((m) => {
      const season: Season = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "seasons", `${m.slug}.json`), "utf8"));
      // Nationalteams auf Deutsch anzeigen; Frauenteams eindeutig kennzeichnen
      for (const [id, { code, women }] of Object.entries(season.teamCodes ?? {})) {
        const name = countryNameDe(code, season.teams[id]) ?? season.teams[id];
        season.teams[id] = women ? `${name} (Frauen)` : name;
      }
      return season;
    });
  }
  return cache;
}

export function getSeason(slug: string): Season | undefined {
  return getSeasons().find((s) => s.meta.slug === slug);
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

export function getPlayer(slug: string): PlayerSeason[] {
  const result: PlayerSeason[] = [];
  for (const season of getSeasons()) {
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
    countryName: countryNameDe(row.country, row.countryName),
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
export function getLeagueStatuses(): LeagueStatus[] {
  return LEAGUES.map((league) => ({
    league,
    seasons: getSeasons().filter((s) => leagueForSeason(s.meta.slug)?.key === league.key),
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

let clubCache: Club[] | null = null;

/** Alle Vereine mit mindestens einem erfassten Spieler, über alle Saisons zusammengefasst. */
export function getClubs(): Club[] {
  if (clubCache) return clubCache;
  const bySlug = new Map<string, Club>();
  for (const season of getSeasons()) {
    const teamIds = new Set(season.players.map((p) => p.team));
    for (const teamId of teamIds) {
      const name = season.teams[String(teamId)];
      const slug = clubSlug(name);
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
  clubCache = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
  return clubCache;
}

export function getClub(slug: string): Club | undefined {
  return getClubs().find((c) => c.slug === slug);
}

/** Vereine einer Saison, sortiert nach Pre-Assists. */
export function seasonClubs(season: Season) {
  return getClubs()
    .flatMap((c) => c.seasons.filter((cs) => cs.season === season).map((cs) => ({ club: c, cs })))
    .map(({ club, cs }) => ({
      club,
      goals: cs.goals.length,
      preAssists: cs.goals.filter((g) => g.pre).length,
      leader: [...cs.players].sort((a, b) => b.preAssists - a.preAssists)[0],
    }))
    .sort((a, b) => b.preAssists - a.preAssists || b.goals - a.goals);
}
