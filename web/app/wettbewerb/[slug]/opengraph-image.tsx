import { getSeason, getSeasons, seasonLabel } from "@/lib/data";
import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Pre-Assist-Rangliste";

export function generateStaticParams() {
  return getSeasons().map((s) => ({ slug: s.meta.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const season = getSeason((await params).slug)!;
  const top = season.players[0];
  return ogText(
    seasonLabel(season.meta),
    `Spitze: ${top.name} mit ${top.preAssists} Pre-Assists · ${season.meta.preAssists} Tore mit Pre-Assist`,
    `Pre-Assists · ${season.meta.country}`,
  );
}
