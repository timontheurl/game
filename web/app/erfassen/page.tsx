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
          Tore mit Assist und Pre-Assist der österreichischen Bundesliga 2026/27 eintragen. Nach dem Anmelden werden die
          Daten mit einem Klick veröffentlicht; die Website aktualisiert sich danach automatisch.
        </p>
      </section>
      <section className="section">
        <ol className="howto">
          <li>Einmalig je Team den Kader einfügen (unten bei „Kader eintragen“).</li>
          <li>Spiel anlegen, dann je Tor Minute, Torschütze, Assist und Pre-Assist eintragen.</li>
          <li>Auf dem Spielfeld nacheinander anklicken, wo Pre-Assist, Vorlage und Abschluss waren (Angriff nach rechts).</li>
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
