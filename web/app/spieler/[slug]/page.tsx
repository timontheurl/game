import type { Metadata } from "next";
import { getPlayer, getPlayerSlugs, seasonLabel } from "@/lib/data";
import { alternates } from "@/lib/i18n";
import { hasPlayerImage } from "@/lib/playerImage";
import PlayerView from "@/views/PlayerView";

export function generateStaticParams() {
  return getPlayerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entries = getPlayer(slug);
  if (!entries[0]) return { title: "Spieler" };
  const { row, season } = entries[0];
  const image = hasPlayerImage(row.slug) ? `/og/spieler/${row.slug}.png` : undefined;
  return {
    title: `${row.name} – Pre-Assists`,
    openGraph: image ? { images: [{ url: image, width: 1200, height: 630 }] } : undefined,
    description: `${row.name} (${season.teams[String(row.team)]}): ${row.preAssists} Pre-Assists, ${row.assists} Assists und ${row.goals} Tore in der ${seasonLabel(season.meta)} – mit allen Spielzügen.`,
    alternates: alternates("spieler", slug),
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PlayerView slug={(await params).slug} lang="de" />;
}
