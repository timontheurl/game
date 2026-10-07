import type { Metadata } from "next";
import { getSeason, getSeasons, seasonLabel } from "@/lib/data";
import { alternates } from "@/lib/i18n";
import CompetitionView from "@/views/CompetitionView";

export function generateStaticParams() {
  return getSeasons().map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const season = getSeason(slug);
  if (!season) return { title: "Wettbewerb" };
  return {
    title: `Pre-Assists ${seasonLabel(season.meta)}`,
    description: `Rangliste der Pre-Assists in der ${seasonLabel(season.meta)}: alle Spieler, Vereine und die häufigsten Torketten.`,
    alternates: alternates("wettbewerb", slug),
  };
}

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <CompetitionView slug={(await params).slug} lang="de" />;
}
