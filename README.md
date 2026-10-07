# PreAssist – die Anlaufstelle für Pre-Assists

Website mit Ranglisten, Spielerprofilen und Passketten zum **Pre-Assist**: dem Pass, der zum Assist führt.

```
Pre-Assist  →  Assist  →  Tor
```

## Funktionen

| Seite | Inhalt |
|---|---|
| `/` | Einstieg mit animierter Erklärgrafik, Top 3 je Liga |
| `/ligen`, `/liga/[key]` | Alle Ligen, auch geplante (Daten folgen) |
| `/wettbewerb/[slug]` | Rangliste einer Saison, Vereine, häufigste Torketten |
| `/vereine`, `/verein/[slug]` | Vereine nach Pre-Assists, Kader, Startpunkte der Pre-Assists |
| `/spieler/[slug]` | Spielerkarte, Kennzahlen, Pass-Arten, Saisonverlauf, alle Spielzüge |
| `/torketten` | Alle Tore mit Filtern und animierter Wiederholung |
| `/vergleich` | Zwei Spieler im Duell, Zufallsduell |
| `/rekorde` | Bestwerte aus allen vollständigen Saisons |

Dazu: Spielersuche, Animationen beim Scrollen, 3D-Karten, Vorschaubilder für geteilte Links, Sitemap.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `pipeline/` | Python-Skript, das Spieldaten lädt und Pre-Assists berechnet, plus Tests |
| `web/` | Next.js-Website (statischer Export), liest die JSON-Dateien aus `web/data/` |
| `web/lib/leagues.ts` | Verzeichnis aller Ligen – neue Ligen hier eintragen |
| `web/lib/site.ts` | Angaben für Impressum und Datenschutz |
| `.github/workflows/ci.yml` | Tests und Build bei jedem Pull Request |
| `.github/workflows/daten-update.yml` | Rechnet jeden Montag neu und öffnet bei Änderungen einen Pull Request |
| `web/data/manual/` | Händisch erfasste Saisons aus dem Erfassungs-Tool (`/erfassen`) |

Eine neue Liga kommt dazu, indem die Pipeline eine Saison mit passendem Slug liefert (z. B. `serie-a-2024-25` für
die Liga `serie-a`). Ranglisten, Vereins- und Spielerseiten entstehen dann automatisch.

### Datenquelle

[StatsBomb Open Data](https://github.com/statsbomb/open-data): kostenlose Event-Daten (jeder Pass mit Spieler, Position und Empfänger).

| Wettbewerb | Abdeckung |
|---|---|
| Premier League 2015/16 | komplette Saison (380 Spiele) |
| La Liga 2015/16 | komplette Saison (380 Spiele) |
| Bundesliga 2023/24 | nur die 34 Spiele von Bayer Leverkusen |

Weitere Saisons werden in `SEASONS` in `pipeline/build_data.py` eingetragen. Für aktuelle Saisons oder weitere Ligen
(z. B. die österreichische Bundesliga) braucht es lizenzierte Event-Daten (Opta, Wyscout, Hudl StatsBomb). Dafür wird
nur der Lade-Teil der Pipeline angepasst, die Berechnung bleibt gleich.

### Definition Pre-Assist

1. Ausgangspunkt ist ein Tor mit Assist (der vom Datenanbieter markierte Vorlagenpass). Eigentore zählen nicht.
2. Der Pre-Assist ist ein angekommener Pass eines Mitspielers an den späteren Assistgeber.
3. Dazwischen kontrolliert kein Gegner den Ball, und kein anderer Mitspieler berührt ihn (Dribbeln des Assistgebers ist erlaubt).
4. Beide Pässe liegen in derselben Ballbesitzphase.

Ausführlich auf der Seite `/methodik` der Website.

## Lokal starten

```bash
# 1. Daten neu berechnen (optional, die Ergebnisse liegen schon in web/data/)
python3 pipeline/build_data.py      # nur Standardbibliothek, ~2 Min. beim ersten Lauf
python3 -m unittest discover -s pipeline   # Tests der Pre-Assist-Erkennung

# 2. Website
cd web
npm install
npm run dev                          # http://localhost:3000
npm run build                        # statische Seite in web/out/
```

## Veröffentlichen

`web/out/` ist eine reine statische Seite und kann auf jedem Hosting liegen (Vercel, Netlify, GitHub Pages).
Bei Vercel als Root-Verzeichnis `web` angeben.
