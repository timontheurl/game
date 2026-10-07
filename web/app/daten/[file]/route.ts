import { getSeason, getSeasons, teamSlugs, type Goal, type Match } from "@/lib/data";

// Statische JSON-Dateien mit allen Toren einer Saison, z. B. /daten/la-liga-2015-16.json.
// Englisch: /daten/en-la-liga-2015-16.json (übersetzte Team- und Wettbewerbsnamen).
// Der Torketten-Explorer lädt sie erst bei Bedarf, damit die Seiten selbst schlank bleiben.

export const dynamic = "force-static";

export interface ChainData {
  slug: string;
  label: string;
  goals: Goal[];
  names: Record<string, string>;
  slugs: Record<string, string>;
  teams: Record<string, string>;
  teamSlugs: Record<string, string>;
  matches: Record<string, Match>;
}

export function generateStaticParams() {
  return getSeasons().flatMap((s) => [{ file: `${s.meta.slug}.json` }, { file: `en-${s.meta.slug}.json` }]);
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const en = file.startsWith("en-");
  const season = getSeason(file.replace(/^en-/, "").replace(/\.json$/, ""), en ? "en" : "de");
  if (!season) return new Response("Nicht gefunden", { status: 404 });
  const data: ChainData = {
    slug: season.meta.slug,
    label: `${season.meta.name} ${season.meta.season}`,
    goals: season.goals,
    names: season.names,
    slugs: Object.fromEntries(season.players.map((p) => [String(p.id), p.slug])),
    teams: season.teams,
    teamSlugs: teamSlugs(season),
    matches: season.matches,
  };
  return Response.json(data);
}
