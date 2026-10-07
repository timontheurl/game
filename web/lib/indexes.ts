import { getSeasons, seasonLabel, toCard } from "./data";
import type { CardData } from "./cards";
import type { Lang } from "./i18n";

// Inhalte der statischen JSON-Dateien für Spielersuche und Spielervergleich (je Sprache eine Datei).

export interface CompareEntry extends CardData {
  key: string; // "<spieler-slug>|<saison-slug>"
  seasonSlug: string;
}

export function compareEntries(lang: Lang) {
  const entries: CompareEntry[] = getSeasons(lang).flatMap((season) =>
    season.players.map((p) => ({
      ...toCard(season, p),
      key: `${p.slug}|${season.meta.slug}`,
      seasonSlug: season.meta.slug,
    })),
  );
  entries.sort((a, b) => b.preAssists - a.preAssists || b.involvements - a.involvements);
  return entries;
}

export interface SearchEntry {
  slug: string;
  name: string;
  team: string;
  season: string;
  preAssists: number;
  position: string | null;
}

export function searchEntries(lang: Lang) {
  const best = new Map<string, SearchEntry>();
  for (const season of getSeasons(lang)) {
    for (const p of season.players) {
      const prev = best.get(p.slug);
      if (prev && prev.preAssists >= p.preAssists) continue;
      best.set(p.slug, {
        slug: p.slug,
        name: p.name,
        team: season.teams[String(p.team)],
        season: seasonLabel(season.meta),
        preAssists: p.preAssists,
        position: p.position,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.preAssists - a.preAssists);
}
