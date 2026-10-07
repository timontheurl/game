import type { Metadata } from "next";
import { getSeason, getSeasons, seasonLabel } from "@/lib/data";
import { alternates } from "@/lib/i18n";
import CompetitionView from "@/views/CompetitionView";

export function generateStaticParams() {
  return getSeasons().map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const season = getSeason(slug, "en");
  if (!season) return { title: "Competition" };
  return {
    title: `Pre-assists ${seasonLabel(season.meta)}`,
    description: `Pre-assist ranking for ${seasonLabel(season.meta)}: all players, clubs and the most frequent goal chains.`,
    alternates: alternates("wettbewerb", slug),
    openGraph: { images: [`/wettbewerb/${slug}/opengraph-image`] },
  };
}

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <CompetitionView slug={(await params).slug} lang="en" />;
}
