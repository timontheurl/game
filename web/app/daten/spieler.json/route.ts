import { getSeasons, toCard } from "@/lib/data";
import type { CardData } from "@/lib/cards";

// Alle Spieler-Saisons als statische JSON-Datei für den Spielervergleich.
export const dynamic = "force-static";

export interface CompareEntry extends CardData {
  key: string; // "<spieler-slug>|<saison-slug>"
  seasonSlug: string;
}

export function GET() {
  const entries: CompareEntry[] = getSeasons().flatMap((season) =>
    season.players.map((p) => ({
      ...toCard(season, p),
      key: `${p.slug}|${season.meta.slug}`,
      seasonSlug: season.meta.slug,
    })),
  );
  entries.sort((a, b) => b.preAssists - a.preAssists || b.involvements - a.involvements);
  return Response.json(entries);
}
