import { getPlayer, getPlayerSlugs, seasonLabel } from "@/lib/data";
import { OG_SIZE, ogPlayer } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Spielerkarte mit Pre-Assists";

export function generateStaticParams() {
  return getPlayerSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const entries = getPlayer((await params).slug);
  // Die Saison mit den meisten Pre-Assists steht im Vorschaubild
  const best = [...entries].sort((a, b) => b.row.preAssists - a.row.preAssists)[0];
  const { season, row } = best;
  return ogPlayer({
    name: row.name,
    team: season.teams[String(row.team)],
    season: seasonLabel(season.meta),
    position: row.position,
    preAssists: row.preAssists,
    assists: row.assists,
    goals: row.goals,
    xg: row.preAssistXg,
  });
}
