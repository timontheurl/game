import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import ClubsView from "@/views/ClubsView";

export const metadata: Metadata = {
  title: "Vereine",
  description: "Alle Vereine nach Pre-Assists: Welche Mannschaft bereitet ihre Tore am häufigsten über zwei Pässe vor?",
  alternates: alternates("vereine"),
};

export default function VereinePage() {
  return <ClubsView lang="de" />;
}
