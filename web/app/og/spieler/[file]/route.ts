import { getPlayerSlugs, seasonLabel } from "@/lib/data";
import { bestSeason, hasPlayerImage } from "@/lib/playerImage";
import { ogPlayer } from "@/lib/og";

// Vorschaubild je Spieler unter /og/spieler/<slug>.png – alle anderen Spieler nutzen das Bild der Startseite.
export const dynamic = "force-static";

export function generateStaticParams() {
  return getPlayerSlugs()
    .filter(hasPlayerImage)
    .map((slug) => ({ file: `${slug}.png` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const best = bestSeason(file.replace(/\.png$/, ""));
  if (!best) return new Response("Nicht gefunden", { status: 404 });
  const { season, row } = best;
  return ogPlayer({
    name: row.name,
    team: season.teams[String(row.team)],
    season: seasonLabel(season.meta),
    position: row.position,
    preAssists: row.preAssists,
    assists: row.assists,
    goals: row.goals,
    xg: row.xpa,
  });
}
