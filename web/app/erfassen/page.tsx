import type { Metadata } from "next";
import ManualEditor from "@/components/ManualEditor";

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
          Hier werden Tore mit Assist und Pre-Assist von Hand erfasst – z. B. für die österreichische Bundesliga. Alles
          bleibt in diesem Browser gespeichert, bis du es exportierst.
        </p>
      </section>
      <section className="section">
        <ol className="howto">
          <li>Spiel anlegen, dann je Tor Minute, Torschütze, Assist und Pre-Assist eintragen.</li>
          <li>Auf dem Spielfeld nacheinander anklicken, wo Pre-Assist, Vorlage und Abschluss waren (Angriff nach rechts).</li>
          <li>
            <b>Exportieren</b> und die Datei auf GitHub nach <code>web/data/manual/</code> hochladen – nach dem nächsten
            Build steht die Liga mit Ranglisten, Karten und Spielzügen online.
          </li>
        </ol>
        <ManualEditor />
      </section>
    </>
  );
}
