import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import { LEAGUES, getLeague } from "@/lib/leagues";
import LeagueView from "@/views/LeagueView";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ key: l.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const league = getLeague(key);
  return {
    title: league ? `${league.en.name} – Pre-Assists` : "League",
    alternates: alternates("liga", key),
    openGraph: { images: [`/liga/${key}/opengraph-image`] },
  };
}

export default async function LeaguePage({ params }: { params: Promise<{ key: string }> }) {
  return <LeagueView leagueKey={(await params).key} lang="en" />;
}
