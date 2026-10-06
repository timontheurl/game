import type { Metadata } from "next";
import Link from "next/link";
import { SITE, filled } from "@/lib/site";

export const metadata: Metadata = { title: "Datenschutzerklärung", robots: { index: false } };

export default function DatenschutzPage() {
  const o = SITE.owner;
  const missing = <span className="placeholder">[Angaben fehlen – siehe Impressum]</span>;
  return (
    <article className="prose">
      <h1>Datenschutzerklärung</h1>
      <p className="muted">Stand: Oktober 2026</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {filled(o.name) ? o.name : missing}
        {filled(o.street) && (
          <>
            <br />
            {o.street}, {o.city}, {o.country}
          </>
        )}
        <br />
        E-Mail: {filled(o.email) ? <a href={`mailto:${o.email}`}>{o.email}</a> : missing}
      </p>

      <h2>2. Das Wichtigste in Kürze</h2>
      <ul>
        <li>Es gibt keine Benutzerkonten, keine Formulare und keinen Newsletter.</li>
        <li>Es werden keine Cookies gesetzt und keine Tracking- oder Analyse-Dienste verwendet.</li>
        <li>Es wird keine Werbung eingeblendet.</li>
        <li>Schriften und Grafiken liegen auf unserem eigenen Server; es werden keine Inhalte von Drittanbietern nachgeladen.</li>
      </ul>

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Die Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Beim Aufruf der
        Website verarbeitet Vercel technisch notwendige Daten, insbesondere die IP-Adresse, Datum und Uhrzeit des
        Abrufs, die aufgerufene Seite, Browser-Typ und Betriebssystem (Server-Logfiles). Diese Daten werden benötigt,
        um die Website auszuliefern und ihre Sicherheit und Stabilität zu gewährleisten.
      </p>
      <p>
        Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und funktionsfähigen Betrieb der Website
        (Art. 6 Abs. 1 lit. f DSGVO). Mit Vercel besteht ein Auftragsverarbeitungsvertrag. Da Vercel Daten auch in den
        USA verarbeiten kann, erfolgt die Übermittlung auf Grundlage des EU-US Data Privacy Framework bzw. der
        EU-Standardvertragsklauseln. Weitere Informationen:{" "}
        <a href="https://vercel.com/legal/privacy-policy">Datenschutzerklärung von Vercel</a>.
      </p>

      <h2>4. Kontakt per E-Mail</h2>
      <p>
        Wenn Sie uns per E-Mail kontaktieren, verwenden wir Ihre Angaben nur, um Ihre Anfrage zu bearbeiten, und löschen
        sie, sobald sie nicht mehr benötigt werden (Art. 6 Abs. 1 lit. b bzw. f DSGVO).
      </p>

      <h2>5. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Wenden Sie sich dazu an die oben genannte
        E-Mail-Adresse. Außerdem können Sie sich bei der Aufsichtsbehörde beschweren, in Österreich bei der{" "}
        <a href="https://www.dsb.gv.at">Datenschutzbehörde</a>, Barichgasse 40–42, 1030 Wien.
      </p>

      <p className="muted">
        Siehe auch das <Link href="/impressum/">Impressum</Link>.
      </p>
    </article>
  );
}
