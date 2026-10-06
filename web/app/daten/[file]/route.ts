import { getSeason, getSeasons, type Goal, type Match } from "@/lib/data";

// Statische JSON-Dateien mit allen Toren einer Saison, z. B. /daten/la-liga-2015-16.json.
// Der Torketten-Explorer lädt sie erst bei Bedarf, damit die Seiten selbst schlank bleiben.

export const dynamic = "force-static";

export interface ChainData {
  slug: string;
  label: string;
  goals: Goal[];
  names: Record<string, string>;
  slugs: Record<string, string>;
  teams: Record<string, string>;
  matches: Record<string, Match>;
}

export function generateStaticParams() {
  return getSeasons().map((s) => ({ file: `${s.meta.slug}.json` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const season = getSeason(file.replace(/\.json$/, ""));
  if (!season) return new Response("Nicht gefunden", { status: 404 });
  const data: ChainData = {
    slug: season.meta.slug,
    label: `${season.meta.name} ${season.meta.season}`,
    goals: season.goals,
    names: season.names,
    slugs: Object.fromEntries(season.players.map((p) => [String(p.id), p.slug])),
    teams: season.teams,
    matches: season.matches,
  };
  return Response.json(data);
}
