import type { Metadata } from "next";
import PlayerCompare from "@/components/PlayerCompare";

export const metadata: Metadata = {
  title: "Spielervergleich",
  description: "Zwei Spieler im direkten Duell: Pre-Assists, Assists, Tore und Werte pro 90 Minuten.",
};

export default function VergleichPage() {
  return (
    <>
      <section className="page-intro">
        <h1>Spielervergleich</h1>
        <p>Zwei Spieler, ein Duell. Wähle beliebige Spieler aus allen Ligen und Saisons – oder lass den Zufall entscheiden.</p>
      </section>
      <section className="section">
        <PlayerCompare />
      </section>
    </>
  );
}
