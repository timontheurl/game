import { getSeasons, seasonLabel } from "@/lib/data";

export const dynamic = "force-static";

export interface SearchEntry {
  slug: string;
  name: string;
  team: string;
  season: string;
  preAssists: number;
  position: string | null;
}

export function GET() {
  const best = new Map<string, SearchEntry>();
  for (const season of getSeasons()) {
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
  const entries = [...best.values()].sort((a, b) => b.preAssists - a.preAssists);
  return Response.json(entries);
}
