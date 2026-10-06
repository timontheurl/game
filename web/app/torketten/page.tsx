import type { Metadata } from "next";
import ChainExplorer from "@/components/ChainExplorer";
import { getSeasons, seasonLabel } from "@/lib/data";

export const metadata: Metadata = {
  title: "Torketten",
  description: "Jedes Tor als Spielzug: Pre-Assist, Assist und Abschluss – filtern, sortieren und als Animation ansehen.",
};

export default function TorkettenPage() {
  // Volle Saisons zuerst, sie haben die meisten Tore
  const seasons = [...getSeasons()]
    .sort((a, b) => Number(b.meta.coverage === "full") - Number(a.meta.coverage === "full"))
    .map((s) => ({ slug: s.meta.slug, label: seasonLabel(s.meta) }));

  return (
    <>
      <section className="page-intro">
        <h1>Torketten</h1>
        <p>
          Jedes Tor als Spielzug: vom Pre-Assist über die Vorlage bis zum Abschluss. Filtere nach Team, Spieler oder
          Pass-Art und sieh dir den Angriff als Animation an.
        </p>
      </section>
      <section className="section">
        <ChainExplorer seasons={seasons} />
      </section>
    </>
  );
}
