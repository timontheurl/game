import type { Metadata } from "next";

export const metadata: Metadata = { title: "Methodik" };

export default function MethodikPage() {
  return (
    <article className="prose">
      <h1>Wie wir Pre-Assists zählen</h1>

      <p>
        Ein <strong>Pre-Assist</strong> (auch „Second Assist“ oder „Hockey Assist“) ist der Pass, der zum
        Assistgeber gespielt wird, bevor dieser die Torvorlage gibt. Damit die Zahlen vergleichbar und nachvollziehbar
        sind, gelten feste Regeln.
      </p>

      <h2>Die Regeln</h2>
      <ol>
        <li>
          <strong>Ausgangspunkt ist ein Tor mit Assist.</strong> Als Assist zählt der Pass, den der Datenanbieter
          als Vorlage für den Torschuss markiert hat. Eigentore werden nicht gezählt.
        </li>
        <li>
          <strong>Der Pre-Assist muss beim Assistgeber ankommen.</strong> Es zählt nur ein angekommener Pass eines
          Mitspielers, dessen Empfänger der spätere Assistgeber ist.
        </li>
        <li>
          <strong>Keine Unterbrechung.</strong> Zwischen Pre-Assist und Assist darf kein Gegner den Ball kontrollieren
          (Balleroberung, Abfangen, Klärung, Block, Torwartaktion), und kein anderer Mitspieler darf den Ball berühren.
          Der Assistgeber darf dribbeln und den Ball führen.
        </li>
        <li>
          <strong>Gleiche Ballbesitzphase.</strong> Pre-Assist und Assist müssen in derselben Ballbesitzphase
          passieren. Standards (Freistöße, Einwürfe, Ecken) können Pre-Assists sein.
        </li>
        <li>
          <strong>Kein Pre-Assist ohne Assist.</strong> Elfmeter, Solo-Tore oder Abstauber nach einer Parade haben
          weder Assist noch Pre-Assist.
        </li>
      </ol>

      <h2>Kennzahlen</h2>
      <dl>
        <dt>Beteiligung</dt>
        <dd>Tore + Assists + Pre-Assists.</dd>
        <dt>Pre-Assist xG</dt>
        <dd>
          Summe der Expected Goals (xG) der Torschüsse, die auf die eigenen Pre-Assists folgten. Ein hoher Wert
          bedeutet: Die Spielzüge führten zu Großchancen.
        </dd>
        <dt>xPA – erwartete Pre-Assists</dt>
        <dd>
          Pre-Assists hängen davon ab, ob die Mitspieler treffen. Der xPA zählt deshalb alle Abschlüsse nach einem
          eigenen Pre-Assist – auch die, die nicht im Tor landen – und gewichtet jeden mit seiner Torwahrscheinlichkeit
          (xG). So zeigt er, wie gut ein Spieler Chancen vorbereitet, unabhängig vom Glück im Abschluss. Liegt der xPA
          deutlich über den echten Pre-Assists, hatte der Spieler Pech mit seinen Mitspielern.
        </dd>
        <dt>Pro 90 Minuten</dt>
        <dd>Werte geteilt durch gespielte Minuten mal 90 – fair für Einwechselspieler.</dd>
      </dl>

      <h2>Datenquelle</h2>
      <p>
        Grundlage sind die frei verfügbaren{" "}
        <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a>. Sie enthalten jede Aktion eines
        Spiels mit Spieler, Position und Ergebnis. Für die Premier League und La Liga 2015/16 ist jeweils die komplette
        Saison verfügbar, für die Bundesliga 2023/24 nur die Spiele von Bayer Leverkusen.
      </p>
      <p>
        Die Berechnung ist automatisiert: Ein Skript läuft vom Torschuss rückwärts durch die Spielaktionen und
        prüft die Regeln oben. Mit lizenzierten Daten eines Anbieters lassen sich so jederzeit weitere Ligen und
        aktuelle Saisons ergänzen.
      </p>
    </article>
  );
}
