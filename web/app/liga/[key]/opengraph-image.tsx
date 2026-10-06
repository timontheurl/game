import { LEAGUES, getLeague } from "@/lib/leagues";
import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Liga auf PreAssists";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ key: l.key }));
}

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const league = getLeague((await params).key)!;
  return ogText(league.name, league.blurb, league.country);
}
