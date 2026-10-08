// Teams, Spielpläne und Ergebnisse der laufenden Saison aus openfootball (gemeinfrei, github.com/openfootball).
// Läuft im Browser: Das Erfassungs-Tool lädt die Dateien direkt von GitHub.

import type { GoalKind, ManualGoal, ManualMatch, ManualSeasonFile } from "./manualTypes";

export const CURRENT_SEASON = "2026/27";
const SEASON_DIR = "2026-27";
const RAW = "https://raw.githubusercontent.com/openfootball";

export interface LeagueSource {
  key: string; // wie in lib/leagues.ts
  name: string;
  country: string;
  url: string;
  format: "json" | "txt";
}

export const LEAGUE_SOURCES: LeagueSource[] = [
  {
    key: "oesterreich-bundesliga",
    name: "Österreichische Bundesliga",
    country: "Österreich",
    // Die Textfassung enthält auch Torschützen und Minuten
    url: `${RAW}/austria/master/${SEASON_DIR}/1-bundesliga.txt`,
    format: "txt",
  },
  { key: "bundesliga", name: "Bundesliga", country: "Deutschland", url: `${RAW}/football.json/master/${SEASON_DIR}/de.1.json`, format: "json" },
  { key: "premier-league", name: "Premier League", country: "England", url: `${RAW}/football.json/master/${SEASON_DIR}/en.1.json`, format: "json" },
  { key: "la-liga", name: "La Liga", country: "Spanien", url: `${RAW}/football.json/master/${SEASON_DIR}/es.1.json`, format: "json" },
  { key: "serie-a", name: "Serie A", country: "Italien", url: `${RAW}/football.json/master/${SEASON_DIR}/it.1.json`, format: "json" },
  { key: "ligue-1", name: "Ligue 1", country: "Frankreich", url: `${RAW}/football.json/master/${SEASON_DIR}/fr.1.json`, format: "json" },
  { key: "eredivisie", name: "Eredivisie", country: "Niederlande", url: `${RAW}/football.json/master/${SEASON_DIR}/nl.1.json`, format: "json" },
];

export const seasonSlug = (key: string) => `${key}-${SEASON_DIR}`;

export function emptySeasonFor(source: LeagueSource): ManualSeasonFile {
  return {
    version: 1,
    slug: seasonSlug(source.key),
    name: source.name,
    country: source.country,
    season: CURRENT_SEASON,
    teams: [],
    matches: [],
    goals: [],
    players: {},
  };
}

export interface FixtureGoal {
  minute: number;
  side: "home" | "away";
  scorer: string;
  kind: GoalKind;
}

export interface Fixture {
  round: number;
  date: string; // JJJJ-MM-TT
  home: string;
  away: string;
  score: [number, number] | null; // null = noch nicht gespielt
  goals: FixtureGoal[] | null; // null = Torschützen nicht bekannt
}

export interface FixtureList {
  teams: string[];
  fixtures: Fixture[];
}

// ---------- JSON (football.json) ----------

interface JsonMatch {
  round: string;
  date: string;
  team1: string;
  team2: string;
  score?: { ft?: [number, number] };
}

export function parseFootballJson(json: { matches: JsonMatch[] }): FixtureList {
  const rounds = new Map<string, number>();
  const fixtures = json.matches.map((m) => {
    if (!rounds.has(m.round)) rounds.set(m.round, Number(m.round.match(/\d+/)?.[0]) || rounds.size + 1);
    return {
      round: rounds.get(m.round)!,
      date: m.date,
      home: m.team1,
      away: m.team2,
      score: m.score?.ft ?? null,
      goals: null,
    };
  });
  return { teams: teamsOf(fixtures), fixtures };
}

// ---------- Text (Football.TXT) ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_LINE = /^\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\.?\s+([A-Z][a-z]{2})\w*\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/;
const SCORE = String.raw`(\d+)-(\d+)(?:\s*\(\d+-\d+\))?`;
const MATCH_V = new RegExp(String.raw`^(.+?)\s+v\s+(.+?)(?:\s+${SCORE})?\s*$`);
const MATCH_SCORE = new RegExp(String.raw`^(.+?)\s+${SCORE}\s+(.+?)\s*$`);

/** „Karim KONATE“ → „Karim Konate“ */
function tidyName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Torschützen einer Mannschaft, z. B. „Samuel Adeniran 20', 29'(p), Christoph Lang 79'“ */
function parseScorers(text: string, side: "home" | "away"): FixtureGoal[] {
  const goals: FixtureGoal[] = [];
  let name = "";
  for (const part of text.split(",")) {
    const m = part.trim().match(/^(.*?)\s*(\d+)(?:\+(\d+))?'\s*(?:\((\w+)\))?$/);
    if (!m) continue;
    if (m[1].trim()) name = tidyName(m[1]);
    if (!name) continue;
    const flag = m[4]?.toLowerCase();
    goals.push({
      minute: Number(m[2]) + Number(m[3] ?? 0),
      side,
      scorer: name,
      kind: flag === "og" ? "Eigentor" : flag === "p" || flag === "pen" ? "Elfmeter" : "Spiel",
    });
  }
  return goals;
}

export function parseFootballTxt(text: string): FixtureList {
  const fixtures: Fixture[] = [];
  const teams = new Set<string>();
  let round = 0;
  let phase = "";
  let offset = 0;
  let year = 0;
  let month = -1;
  let date = "";
  let scorerBuf: string | null = null;
  let depth = 0;
  let last: Fixture | null = null;

  // Klammern zählen: „29'(p)“ steht mitten in der Liste, erst die letzte Klammer schließt sie
  const feed = (chunk: string) => {
    for (const ch of chunk) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    scorerBuf = (scorerBuf ?? "") + ` ${chunk}`;
    if (depth <= 0) {
      scorerBuf = scorerBuf.trim().replace(/^\(/, "").replace(/\)$/, "");
      flushScorers();
    }
  };

  const flushScorers = () => {
    if (scorerBuf === null || !last?.score) {
      scorerBuf = null;
      return;
    }
    const [homePart, awayPart] = scorerBuf.split(";");
    if (awayPart !== undefined) {
      last.goals = [...parseScorers(homePart, "home"), ...parseScorers(awayPart, "away")];
    } else {
      // Nur eine Mannschaft hat getroffen
      last.goals = parseScorers(homePart, last.score[0] > 0 ? "home" : "away");
    }
    scorerBuf = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (scorerBuf !== null) {
      feed(line.trim());
      continue;
    }
    if (!line.trim() || line.trim().startsWith("#") || line.startsWith("=")) continue;
    if (line.trim().startsWith("▪") || line.trim().startsWith("»")) {
      // „Regular Season - 4“ kann doppelt vorkommen (Nachtrag); neue Phase zählt weiter
      const head = line.trim().slice(1).trim();
      const n = head.match(/(\d+)\s*$/);
      const name = head.replace(/[\s-]*\d+\s*$/, "");
      if (name !== phase) {
        offset = Math.max(offset, ...fixtures.map((f) => f.round));
        phase = name;
      }
      round = n ? offset + Number(n[1]) : round + 1;
      continue;
    }
    const d = line.match(DATE_LINE);
    if (d) {
      const mon = MONTHS.indexOf(d[1]);
      if (d[3]) year = Number(d[3]);
      else if (mon < month) year++;
      month = mon;
      date = `${year}-${String(mon + 1).padStart(2, "0")}-${d[2].padStart(2, "0")}`;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("(")) {
      depth = 0;
      scorerBuf = "";
      feed(trimmed);
      continue;
    }
    // Spielzeile, optional mit Uhrzeit
    const body = trimmed.replace(/^\d{1,2}[:.]\d{2}\s+/, "");
    let home: string, away: string, score: [number, number] | null;
    const v = body.match(MATCH_V);
    const s = v ? null : body.match(MATCH_SCORE);
    if (v) {
      [home, away] = [v[1].trim(), v[2].trim()];
      score = v[3] !== undefined ? [Number(v[3]), Number(v[4])] : null;
    } else if (s) {
      [home, away] = [s[1].trim(), s[4].trim()];
      score = [Number(s[2]), Number(s[3])];
    } else continue;
    if (!date || !round) continue;
    teams.add(home);
    teams.add(away);
    last = { round, date, home, away, score, goals: null };
    fixtures.push(last);
  }
  return { teams: [...teams].sort((a, b) => a.localeCompare(b, "de")), fixtures };
}

function teamsOf(fixtures: Fixture[]) {
  return [...new Set(fixtures.flatMap((f) => [f.home, f.away]))].sort((a, b) => a.localeCompare(b, "de"));
}

export async function loadFixtures(source: LeagueSource): Promise<FixtureList> {
  const res = await fetch(source.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Spielplan nicht gefunden (Fehler ${res.status}).`);
  return source.format === "json" ? parseFootballJson(await res.json()) : parseFootballTxt(await res.text());
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Übernimmt Teams, gespielte Partien und (falls bekannt) Torschützen in die Saison.
 * Bereits erfasste Spiele und Tore bleiben unverändert; neue Ergebnisse kommen dazu.
 */
export function mergeFixtures(file: ManualSeasonFile, list: FixtureList) {
  const data: ManualSeasonFile = structuredClone(file);
  const known = new Set(data.teams);
  data.teams = data.matches.length === 0 ? [...list.teams] : [...data.teams, ...list.teams.filter((t) => !known.has(t))];

  let added = 0;
  let updated = 0;
  let goalsAdded = 0;
  for (const f of list.fixtures) {
    if (!f.score) continue;
    let match: ManualMatch | undefined = data.matches.find((m) => m.date === f.date && m.home === f.home && m.away === f.away);
    if (!match) {
      match = { id: uid(), round: f.round, date: f.date, home: f.home, away: f.away, homeScore: f.score[0], awayScore: f.score[1] };
      data.matches.push(match);
      added++;
    } else if (match.homeScore !== f.score[0] || match.awayScore !== f.score[1]) {
      match.homeScore = f.score[0];
      match.awayScore = f.score[1];
      updated++;
    }
    // Torschützen nur übernehmen, solange für das Spiel noch nichts erfasst ist
    const id = match.id;
    if (f.goals && !data.goals.some((g) => g.match === id)) {
      for (const g of f.goals) {
        const team = g.side === "home" ? f.home : f.away;
        const goal: ManualGoal = {
          id: uid(),
          match: id,
          minute: g.minute,
          team,
          kind: g.kind,
          scorer: g.scorer,
          assist: null,
          pre: null,
          assistType: null,
          preType: null,
          points: {},
          open: true,
        };
        data.goals.push(goal);
        goalsAdded++;
        if (g.kind !== "Eigentor" && !data.players[g.scorer]) data.players[g.scorer] = { team };
      }
    }
  }
  return { data, added, updated, goalsAdded };
}
