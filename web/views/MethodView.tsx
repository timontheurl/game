import type { Lang } from "@/lib/i18n";

export default function MethodView({ lang }: { lang: Lang }) {
  if (lang === "en") {
    return (
      <article className="prose">
        <h1>How we count pre-assists</h1>

        <p>
          A <strong>pre-assist</strong> (also called “second assist” or “hockey assist”) is the pass played to the
          assist provider before they set up the goal. To keep the numbers comparable and transparent, fixed rules
          apply.
        </p>

        <h2>The rules</h2>
        <ol>
          <li>
            <strong>It starts with a goal that has an assist.</strong> The assist is the pass the data provider marked
            as the key pass for the shot. Own goals are not counted.
          </li>
          <li>
            <strong>The pre-assist must reach the assist provider.</strong> Only a completed pass by a teammate whose
            recipient is the later assist provider counts.
          </li>
          <li>
            <strong>No interruption.</strong> Between pre-assist and assist no opponent may control the ball (ball
            recovery, interception, clearance, block, goalkeeper action), and no other teammate may touch it. The
            assist provider may dribble and carry the ball.
          </li>
          <li>
            <strong>Same possession.</strong> Pre-assist and assist must happen in the same possession. Set pieces
            (free kicks, throw-ins, corners) can be pre-assists.
          </li>
          <li>
            <strong>No pre-assist without an assist.</strong> Penalties, solo goals or rebounds after a save have
            neither an assist nor a pre-assist.
          </li>
        </ol>

        <h2>Metrics</h2>
        <dl>
          <dt>Involvements</dt>
          <dd>Goals + assists + pre-assists.</dd>
          <dt>Pre-assist xG</dt>
          <dd>
            Sum of the expected goals (xG) of the shots that followed the player&apos;s pre-assists. A high value means
            the moves led to big chances.
          </dd>
          <dt>xPA – expected pre-assists</dt>
          <dd>
            Pre-assists depend on teammates scoring. xPA therefore counts every shot after one of the player&apos;s
            pre-assists – including those that miss – and weights each by its goal probability (xG). It shows how well a
            player creates chances, regardless of luck in front of goal. If xPA is clearly above the actual
            pre-assists, the player was unlucky with their teammates.
          </dd>
          <dt>Per 90 minutes</dt>
          <dd>Values divided by minutes played, times 90 – fair to substitutes.</dd>
        </dl>

        <h2>Data source</h2>
        <p>
          The basis is the freely available <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a>.
          It contains every action of a match with player, location and outcome. The complete competitions are
          available for the big five leagues 2015/16, the Frauen-Bundesliga 2023/24 and several World Cups and
          European Championships; for the Bundesliga 2023/24 only Bayer Leverkusen&apos;s matches.
        </p>
        <p>
          The calculation is automated: a script walks backwards from the shot through the match events and checks
          the rules above. With licensed data from a provider, more leagues and current seasons can be added at any
          time.
        </p>
      </article>
    );
  }
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
          Spiels mit Spieler, Position und Ergebnis. Für die fünf großen Ligen 2015/16, die Frauen-Bundesliga 2023/24 sowie
          mehrere Welt- und Europameisterschaften sind die kompletten Wettbewerbe verfügbar, für die Bundesliga 2023/24
          nur die Spiele von Bayer Leverkusen.
        </p>
        <p>
          Die Berechnung ist automatisiert: Ein Skript läuft vom Torschuss rückwärts durch die Spielaktionen und
          prüft die Regeln oben. Mit lizenzierten Daten eines Anbieters lassen sich so jederzeit weitere Ligen und
          aktuelle Saisons ergänzen.
        </p>
      </article>
  );
}
