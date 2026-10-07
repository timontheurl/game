import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import RecordsView from "@/views/RecordsView";

export const metadata: Metadata = {
  title: "Rekorde",
  description: "Die Bestwerte bei Pre-Assists: meiste in einer Saison, beste Quote, längster Pass, eingespieltestes Trio.",
  alternates: alternates("rekorde"),
};

export default function RekordePage() {
  return <RecordsView lang="de" />;
}
