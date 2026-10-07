import fs from "node:fs";
import path from "node:path";
import { countryNameDe, slugify } from "./cards";
import type { Goal, Match, PassInfo, PlayerRow, Season } from "./data";
import type { ManualSeasonFile, PassType, Pt } from "./manualTypes";

// Wandelt händisch erfasste Saisons (web/data/manual/*.json) in dasselbe Format um wie die StatsBomb-Daten.
// So funktionieren Ranglisten, Karten, Spielerseiten und Torketten ohne Sonderfälle.
// Werte, die sich nicht erfassen lassen (xG, Spielminuten), bleiben 0.

const MANUAL_DIR = path.join(process.cwd(), "data", "manual");

/** Stabile Zahlen-ID aus einem Namen (FNV-1a), weit weg von den StatsBomb-IDs. */
function idFor(kind: string, name: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${kind}:${name}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 2_000_000_000 + (h % 1_000_000_000);
}

const passFlags = (t: PassType | null) => ({
  height: t === "Hoher Ball" || t === "Flanke" ? "High Pass" : t ? "Ground Pass" : null,
  type: t === "Ecke" ? "Corner" : t === "Freistoß" ? "Free Kick" : t === "Einwurf" ? "Throw-in" : null,
  technique: t === "Steilpass" ? "Through Ball" : null,
  cross: t === "Flanke",
  through: t === "Steilpass",
  cutback: t === "Rückpass",
});

function pass(player: number, start: Pt, end: Pt, t: PassType | null, minute: number): PassInfo {
  return { player, start, end, ...passFlags(t), minute, second: 0 };
}

export function convertManual(file: ManualSeasonFile): Season | null {
  const teamId = (name: string) => idFor("team", name);
  const playerId = (name: string) => idFor("player", name);

  const teams: Record<string, string> = {};
  for (const t of file.teams) teams[String(teamId(t))] = t;

  const matches: Record<string, Match> = {};
  const matchKey = new Map<string, number>();
  for (const m of file.matches) {
    const id = idFor("match", m.id);
    matchKey.set(m.id, id);
    matches[String(id)] = {
      id,
      date: m.date,
      week: m.round,
      home: teamId(m.home),
      away: teamId(m.away),
      home_score: m.homeScore,
      away_score: m.awayScore,
    };
  }

  const names: Record<string, string> = {};
  const goals: Goal[] = [];
  for (const g of file.goals) {
    // Eigentore zählen für niemanden; ohne Abschlusspunkt lässt sich der Spielzug nicht zeichnen
    if (g.kind === "Eigentor" || !g.points.shot || !matchKey.has(g.match)) continue;
    const minute = Math.max(0, g.minute - 1);
    const period = g.minute > 45 ? 2 : 1;
    const shot = g.points.shot;
    const assistStart = g.points.assist;
    const preStart = g.points.pre;
    const scorer = playerId(g.scorer);
    names[String(scorer)] = g.scorer;

    let assist: PassInfo | null = null;
    let pre: PassInfo | null = null;
    if (g.assist && assistStart) {
      const id = playerId(g.assist);
      names[String(id)] = g.assist;
      assist = pass(id, assistStart, shot, g.assistType, minute);
      if (g.pre && preStart) {
        const pid = playerId(g.pre);
        names[String(pid)] = g.pre;
        pre = pass(pid, preStart, assistStart, g.preType, minute);
      }
    }

    goals.push({
      id: g.id,
      match: matchKey.get(g.match)!,
      team: teamId(g.team),
      period,
      minute,
      second: 0,
      scorer,
      xg: 0,
      shot: { start: shot, end: null, body: null, type: g.kind === "Elfmeter" ? "Penalty" : "Open Play" },
      pattern: g.kind === "Standard" ? "From Set Piece" : "Regular Play",
      assist,
      pre,
    });
  }
  if (goals.length === 0) return null;

  // Spieler-Statistiken aus den Toren zusammenzählen
  const stats = new Map<number, { name: string; team: string; goals: number; assists: number; pre: number }>();
  const bump = (name: string, team: string, key: "goals" | "assists" | "pre") => {
    const id = playerId(name);
    const s = stats.get(id) ?? { name, team: file.players[name]?.team ?? team, goals: 0, assists: 0, pre: 0 };
    s[key]++;
    stats.set(id, s);
  };
  for (const g of file.goals) {
    if (g.kind === "Eigentor" || !g.points.shot) continue;
    bump(g.scorer, g.team, "goals");
    if (g.assist && g.points.assist) {
      bump(g.assist, g.team, "assists");
      if (g.pre && g.points.pre) bump(g.pre, g.team, "pre");
    }
  }
  const teamMatches = (team: string) => file.matches.filter((m) => m.home === team || m.away === team).length;

  const players: PlayerRow[] = [...stats.entries()].map(([id, s]) => {
    const meta = file.players[s.name];
    const code = meta?.country ?? null;
    return {
      id,
      slug: `${id}-${slugify(s.name)}`,
      name: s.name,
      fullName: s.name,
      team: teamId(s.team),
      goals: s.goals,
      assists: s.assists,
      preAssists: s.pre,
      involvements: s.goals + s.assists + s.pre,
      preAssistXg: 0,
      assistXg: 0,
      xpa: 0,
      xa: 0,
      preChances: s.pre,
      minutes: 0,
      matches: teamMatches(s.team),
      position: meta?.position ?? null,
      country: code,
      countryName: countryNameDe(code, null),
    };
  });
  players.sort((a, b) => b.preAssists - a.preAssists || b.involvements - a.involvements || a.name.localeCompare(b.name));
  for (const p of players) names[String(p.id)] = p.name;

  return {
    meta: {
      slug: file.slug,
      name: file.name,
      country: file.country,
      season: file.season,
      coverage: "full",
      coverageTeam: null,
      national: false,
      manual: true,
      matches: file.matches.length,
      goals: goals.length,
      assists: goals.filter((g) => g.assist).length,
      preAssists: goals.filter((g) => g.pre).length,
    },
    teams,
    teamCodes: {},
    names,
    players,
    matches,
    goals,
  };
}

/** Alle händisch erfassten Saisons mit mindestens einem Tor. */
export function loadManualSeasons(): Season[] {
  if (!fs.existsSync(MANUAL_DIR)) return [];
  return fs
    .readdirSync(MANUAL_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => convertManual(JSON.parse(fs.readFileSync(path.join(MANUAL_DIR, f), "utf8")) as ManualSeasonFile))
    .filter((s): s is Season => s !== null);
}
