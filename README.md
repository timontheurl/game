# PreAssist – die Anlaufstelle für Pre-Assists

Website mit Ranglisten, Spielerprofilen und Passketten zum **Pre-Assist**: dem Pass, der zum Assist führt.

```
Pre-Assist  →  Assist  →  Tor
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `pipeline/` | Python-Skript, das Spieldaten lädt und Pre-Assists berechnet |
| `web/` | Next.js-Website (statischer Export), liest die JSON-Dateien aus `web/data/` |

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

# 2. Website
cd web
npm install
npm run dev                          # http://localhost:3000
npm run build                        # statische Seite in web/out/
```

## Veröffentlichen

`web/out/` ist eine reine statische Seite und kann auf jedem Hosting liegen (Vercel, Netlify, GitHub Pages).
Bei Vercel als Root-Verzeichnis `web` angeben.
