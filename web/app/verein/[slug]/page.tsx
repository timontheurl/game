import type { Metadata } from "next";
import { getClub, getClubs } from "@/lib/data";
import { alternates } from "@/lib/i18n";
import ClubView from "@/views/ClubView";

export function generateStaticParams() {
  return getClubs().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = getClub(slug);
  return {
    title: club ? `${club.name} – Pre-Assists` : "Verein",
    description: club ? `Wer bei ${club.name} die Tore vorbereitet: Pre-Assists, Torketten und Spielerkarten.` : undefined,
    alternates: alternates("verein", slug),
  };
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  return <ClubView slug={(await params).slug} lang="de" />;
}
