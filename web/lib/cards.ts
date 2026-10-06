// Reine Hilfsfunktionen ohne Dateizugriff – dürfen auch im Browser laufen.

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Kartenfarbe wie bei Sammelkarten: Gold, Silber, Bronze nach Pre-Assists. */
export function cardTier(preAssists: number): "gold" | "silver" | "bronze" {
  if (preAssists >= 6) return "gold";
  if (preAssists >= 3) return "silver";
  return "bronze";
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
