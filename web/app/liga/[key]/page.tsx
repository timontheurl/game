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
  return { title: league ? `${league.name} – Pre-Assists` : "Liga", alternates: alternates("liga", key) };
}

export default async function LeaguePage({ params }: { params: Promise<{ key: string }> }) {
  return <LeagueView leagueKey={(await params).key} lang="de" />;
}
