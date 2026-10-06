import { getClub, getClubs } from "@/lib/data";
import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Vereinsseite mit Pre-Assists";

export function generateStaticParams() {
  return getClubs().map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const club = getClub((await params).slug)!;
  const cs = club.seasons[0];
  const top = [...cs.players].sort((a, b) => b.preAssists - a.preAssists)[0];
  const withPre = cs.goals.filter((g) => g.pre).length;
  return ogText(
    club.name,
    `${withPre} von ${cs.goals.length} Toren mit Pre-Assist · Bester Vorbereiter: ${top.name} (${top.preAssists})`,
    "Verein",
  );
}
