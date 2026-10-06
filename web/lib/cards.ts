import type { PassInfo } from "./data";

// Reine Hilfsfunktionen ohne Dateizugriff – dürfen auch im Browser laufen.

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface CardData {
  slug: string;
  name: string;
  team: string;
  position: string | null;
  country: string | null;
  countryName: string | null;
  preAssists: number;
  assists: number;
  goals: number;
  involvements: number;
  preAssistXg: number;
  minutes: number;
  matches: number;
  season: string;
}

const UK: Record<string, string> = { "gb-eng": "England", "gb-sct": "Schottland", "gb-wls": "Wales", "gb-nir": "Nordirland", xk: "Kosovo" };
const regionNames = new Intl.DisplayNames(["de"], { type: "region" });

/** Deutscher Ländername aus dem Flaggen-Code. */
export function countryNameDe(code: string | null, fallback: string | null): string | null {
  if (!code) return fallback;
  if (UK[code]) return UK[code];
  try {
    return regionNames.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Kurzform für das Vereinswappen, z. B. „Real Madrid“ → „RM“, „Barcelona“ → „BAR“. */
export function clubShort(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 2 || /\d/.test(w));
  if (words.length <= 1) return name.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clubSlug(name: string): string {
  return slugify(name);
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
