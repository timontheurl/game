import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import CompareView from "@/views/CompareView";

export const metadata: Metadata = {
  title: "Spielervergleich",
  description: "Zwei Spieler im direkten Duell: Pre-Assists, Assists, Tore und Werte pro 90 Minuten.",
  alternates: alternates("vergleich"),
};

export default function VergleichPage() {
  return <CompareView lang="de" />;
}
