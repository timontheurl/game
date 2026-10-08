import type { Metadata } from "next";
import { SITE, filled } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

function Field({ value, label }: { value: string; label: string }) {
  return filled(value) ? <>{value}</> : <span className="placeholder">[{label} fehlt]</span>;
}

export default function ImpressumPage() {
  const o = SITE.owner;
  return (
    <article className="prose">
      <h1>Impressum</h1>

      <h2>Medieninhaber und Herausgeber</h2>
      <p>
        <Field value={o.name} label="Name" />
        <br />
        <Field value={o.street} label="Straße und Hausnummer" />
        <br />
        <Field value={o.city} label="PLZ und Ort" />
        <br />
        {o.country}
      </p>

      <h2>Team</h2>
      <p>{SITE.team.join(", ")}</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        {filled(o.email) ? <a href={`mailto:${o.email}`}>{o.email}</a> : <Field value="" label="E-Mail-Adresse" />}
      </p>

      <h2>Blattlinie</h2>
      <p>
        {SITE.domain} ist ein privates, nicht-kommerzielles Statistikprojekt über Pre-Assists im Fußball (der Pass vor dem
        Assist). Die Website informiert über Spieler, Mannschaften und Wettbewerbe auf Grundlage öffentlich verfügbarer
        Spieldaten.
      </p>

      <h2>Datenquelle</h2>
      <p>
        Spieldaten: <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a> (Hudl StatsBomb). Die
        Pre-Assists sind eine eigene Auswertung dieser Daten. Diese Website steht in keiner Verbindung zu Hudl
        StatsBomb, den genannten Ligen oder Vereinen.
      </p>

      <h2>Haftung für Inhalte und Links</h2>
      <p>
        Die Inhalte wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Statistiken
        wird keine Gewähr übernommen. Für Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich.
      </p>
    </article>
  );
}
