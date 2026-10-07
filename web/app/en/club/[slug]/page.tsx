import type { Metadata } from "next";
import { getClub, getClubs } from "@/lib/data";
import { alternates } from "@/lib/i18n";
import ClubView from "@/views/ClubView";

export function generateStaticParams() {
  return getClubs().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = getClub(slug, "en");
  return {
    title: club ? `${club.name} – Pre-assists` : "Club",
    description: club ? `Who sets up the goals for ${club.name}: pre-assists, goal chains and player cards.` : undefined,
    alternates: alternates("verein", slug),
    openGraph: { images: [`/verein/${slug}/opengraph-image`] },
  };
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ClubView slug={(await params).slug} lang="en" />;
}
