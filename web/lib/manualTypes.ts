// Dateiformat für händisch erfasste Saisons (Erfassungs-Tool unter /erfassen).
// Exportierte Dateien gehören nach web/data/manual/<slug>.json.

export type Pt = [number, number]; // Spielfeld 120 × 80, Angriff nach rechts

export type GoalKind = "Spiel" | "Standard" | "Elfmeter" | "Eigentor";

export const PASS_TYPES = ["Flachpass", "Steilpass", "Flanke", "Rückpass", "Hoher Ball", "Langer Pass", "Ecke", "Freistoß", "Einwurf"] as const;
export type PassType = (typeof PASS_TYPES)[number];

export interface ManualMatch {
  id: string;
  round: number;
  date: string; // JJJJ-MM-TT
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface ManualGoal {
  id: string;
  match: string;
  minute: number; // wie im Spielbericht, z. B. 45 + 2 → 47
  team: string;
  kind: GoalKind;
  scorer: string;
  assist: string | null;
  pre: string | null;
  assistType: PassType | null;
  preType: PassType | null;
  /** Geklickte Punkte auf dem Spielfeld */
  points: { pre?: Pt; assist?: Pt; shot?: Pt };
}

export interface ManualPlayer {
  team: string;
  position?: string;
  country?: string; // Flaggen-Code, z. B. "at"
}

export interface ManualSeasonFile {
  version: 1;
  slug: string; // z. B. "oesterreich-bundesliga-2025-26"
  name: string;
  country: string;
  season: string;
  teams: string[];
  matches: ManualMatch[];
  goals: ManualGoal[];
  players: Record<string, ManualPlayer>;
}

export const AUSTRIA_TEAMS_2025_26 = [
  "Red Bull Salzburg",
  "Sturm Graz",
  "LASK",
  "Austria Wien",
  "SK Rapid",
  "Wolfsberger AC",
  "TSV Hartberg",
  "SV Ried",
  "SCR Altach",
  "WSG Tirol",
  "GAK",
  "Blau-Weiß Linz",
];

export function emptySeason(): ManualSeasonFile {
  return {
    version: 1,
    slug: "oesterreich-bundesliga-2025-26",
    name: "Österreichische Bundesliga",
    country: "Österreich",
    season: "2025/26",
    teams: [...AUSTRIA_TEAMS_2025_26],
    matches: [],
    goals: [],
    players: {},
  };
}
