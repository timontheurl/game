import type { Metadata } from "next";
import DataDesk from "@/components/DataDesk";

export const metadata: Metadata = {
  title: "Erfassen",
  robots: { index: false, follow: false },
};

export default function ErfassenPage() {
  return (
    <>
      <section className="page-intro">
        <h1>Erfassen</h1>
        <p>
          Tore mit Assist und Pre-Assist der laufenden Saison eintragen. Teams, Spiele und Ergebnisse kommen automatisch
          aus dem Spielplan, für Österreich auch die Torschützen. Nach dem Anmelden wird alles mit einem Klick
          veröffentlicht.
        </p>
      </section>
      <section className="section">
        <ol className="howto">
          <li>Oben die Liga wählen – Teams und gespielte Partien werden geladen, neue Ergebnisse bei jedem Öffnen.</li>
          <li>Einmalig je Team den Kader einfügen (unten bei „Kader eintragen“).</li>
          <li>
            Spiel wählen und je Tor Assist und Pre-Assist eintragen. Aus dem Spielplan übernommene Tore sind als{" "}
            <b>offen</b> markiert – mit „Ergänzen“ öffnen.
          </li>
          <li>Auf dem Spielfeld anklicken, wo Pre-Assist, Vorlage und Abschluss waren (Angriff nach rechts).</li>
          <li>
            <b>Veröffentlichen</b> klicken – nach etwa 5 Minuten stehen Ranglisten, Karten und Spielzüge online. Bis dahin
            bleibt alles auf diesem Gerät gespeichert.
          </li>
        </ol>
        <DataDesk />
      </section>
    </>
  );
}
