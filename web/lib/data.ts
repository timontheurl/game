import fs from "node:fs";
import path from "node:path";

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
  minutes: number;
  matches: number;
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
  matches: number;
  goals: number;
  assists: number;
  preAssists: number;
}

export interface Season {
  meta: SeasonMeta;
  teams: Record<string, string>;
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
    cache = index.map((m) =>
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, "seasons", `${m.slug}.json`), "utf8")),
    );
  }
  return cache;
}

export function getSeason(slug: string): Season | undefined {
  return getSeasons().find((s) => s.meta.slug === slug);
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
export function topCombos(season: Season, limit = 8): Combo[] {
  const map = new Map<string, Combo>();
  for (const g of season.goals) {
    if (!g.pre || !g.assist) continue;
    const key = `${g.pre.player}-${g.assist.player}-${g.scorer}`;
    const c = map.get(key) ?? { pre: g.pre.player, assist: g.assist.player, scorer: g.scorer, count: 0 };
    c.count++;
    map.set(key, c);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Spieler, deren Pre-Assists die eigenen Assists übertreffen – die „stillen Vorbereiter“. */
export function hiddenArchitects(limit = 6) {
  const rows: { season: Season; row: PlayerRow }[] = [];
  for (const season of getSeasons()) {
    if (season.meta.coverage !== "full") continue;
    for (const row of season.players) {
      if (row.preAssists >= 4 && row.preAssists > row.assists) rows.push({ season, row });
    }
  }
  return rows
    .sort((a, b) => b.row.preAssists - b.row.assists - (a.row.preAssists - a.row.assists))
    .slice(0, limit);
}

export function formatClock(period: number, minute: number): string {
  const limit = { 1: 45, 2: 90, 3: 105, 4: 120 }[period];
  if (limit !== undefined && minute >= limit) return `${limit}+${minute - limit + 1}'`;
  return `${minute + 1}'`;
}

export function describePass(p: PassInfo): string {
  if (p.type === "Corner") return "Ecke";
  if (p.type === "Free Kick") return "Freistoß";
  if (p.type === "Throw-in") return "Einwurf";
  if (p.type === "Goal Kick") return "Abstoß";
  if (p.cutback) return "Rückpass";
  if (p.cross) return "Flanke";
  if (p.through) return "Steilpass";
  if (p.height === "High Pass") return "Hoher Ball";
  if (p.height === "Low Pass") return "Halbhoher Pass";
  const len = Math.hypot(p.end[0] - p.start[0], p.end[1] - p.start[1]);
  if (len > 30) return "Langer Pass";
  return "Flachpass";
}
