import { clubSlug } from "./cards";
import { getSeason, getSeasons, playerSlug, seasonLabel, type Goal, type PlayerRow, type Season } from "./data";
import { LOCALE, url, type Lang } from "./i18n";
import { isOneTwo } from "./oneTwo";

// StatsBomb misst in Yards (Feld 120 × 80); für die Anzeige in Metern umrechnen.
const YARD = 0.9144;

export interface RecordEntry {
  value: string;
  name: string;
  href: string | null;
  context: string;
}

export interface RecordList {
  key: string;
  title: string;
  unit: string;
  note: string;
  entries: RecordEntry[];
  /** Link zu allen Treffern, z. B. im Torketten-Explorer */
  more?: { href: string; label: string };
}

const passLen = (g: Goal) => (g.pre ? Math.hypot(g.pre.end[0] - g.pre.start[0], g.pre.end[1] - g.pre.start[1]) * YARD : 0);

// Titel, Einheit und Erklärung je Rekord
const TEXT: Record<Lang, Record<string, [string, string, string]>> = {
  de: {
    meiste: ["Meiste Pre-Assists", "Pre-Assists", "In einer Saison."],
    quote: ["Beste Quote", "pro 90 Min.", "Mindestens 900 Spielminuten."],
    xpa: ["Höchster xPA", "erwartete Pre-Assists", "xG aller Abschlüsse nach eigenen Pre-Assists – misst die Vorbereitung, unabhängig vom Abschluss."],
    pech: ["Pech im Abschluss", "xPA über Pre-Assists", "Erwartete minus echte Pre-Assists: viele gute Vorbereitungen, die Mitspieler trafen nicht."],
    xg: ["Größte Chancen", "Pre-Assist xG", "Summe der Torwahrscheinlichkeit nach eigenen Pre-Assists."],
    architekten: ["Stille Architekten", "mehr als Assists", "Pre-Assists minus eigene Assists – die unterschätzten Vorbereiter."],
    tief: ["Aus der eigenen Hälfte", "Pre-Assists", "Pre-Assists, die in der eigenen Spielhälfte gespielt wurden."],
    laengster: ["Längster Pre-Assist", "Meter", "Gemessen vom Abspiel bis zur Annahme."],
    trio: ["Eingespieltestes Trio", "Tore", "Immer gleiche Kette: Pre-Assist › Assist › Tor."],
    spiel: ["Spiel mit den meisten", "Pre-Assists", "Tore mit Pre-Assist in einem einzigen Spiel (beide Teams)."],
    doppelpass: ["Doppelpass-Könige", "Doppelpass-Tore", "Erst den Pre-Assist gespielt, dann die Vorlage zurückbekommen und selbst getroffen."],
  },
  en: {
    meiste: ["Most pre-assists", "pre-assists", "In a single season."],
    quote: ["Best rate", "per 90 min", "At least 900 minutes played."],
    xpa: ["Highest xPA", "expected pre-assists", "xG of all shots after the player's pre-assists – measures the build-up, regardless of the finish."],
    pech: ["Unlucky", "xPA above pre-assists", "Expected minus actual pre-assists: lots of good build-up, but teammates didn't score."],
    xg: ["Biggest chances", "pre-assist xG", "Sum of the goal probability after the player's pre-assists."],
    architekten: ["Hidden architects", "more than assists", "Pre-assists minus own assists – the underrated creators."],
    tief: ["From their own half", "pre-assists", "Pre-assists played from inside the player's own half."],
    laengster: ["Longest pre-assist", "metres", "Measured from the pass to where it was received."],
    trio: ["Best-drilled trio", "goals", "Always the same chain: pre-assist › assist › goal."],
    spiel: ["Match with the most", "pre-assists", "Goals with a pre-assist in a single match (both teams)."],
    doppelpass: ["One-two kings", "one-two goals", "Played the pre-assist, got the ball back from the assister and scored themselves."],
  },
};

export function getRecords(lang: Lang = "de"): RecordList[] {
  const fmt = (n: number, d = 0) => n.toLocaleString(LOCALE[lang], { minimumFractionDigits: d, maximumFractionDigits: d });

function playerEntries(
  rows: { season: Season; row: PlayerRow; value: number }[],
  digits = 0,
  limit = 5,
): RecordEntry[] {
  return rows
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(({ season, row, value }) => ({
      value: fmt(value, digits),
      name: row.name,
      href: url(lang, "spieler", row.slug),
      context: `${season.teams[String(row.team)]} · ${seasonLabel(season.meta)}`,
    }));
}

  // Saisons mit nur einem Team würden Vergleiche verzerren – Rekorde nur aus vollständigen Saisons
  const seasons = getSeasons(lang).filter((s) => s.meta.coverage === "full");
  const rows = seasons.flatMap((season) => season.players.map((row) => ({ season, row })));
  const goals = seasons.flatMap((season) => season.goals.filter((g) => g.pre).map((g) => ({ season, g })));
  const name = (season: Season, id: number) => season.names[String(id)];
  const link = (season: Season, id: number) => {
    const slug = playerSlug(season, id);
    return slug ? url(lang, "spieler", slug) : null;
  };
  const matchLabel = (season: Season, g: Goal) => {
    const m = season.matches[String(g.match)];
    return `${season.teams[String(m.home)]} ${m.home_score}:${m.away_score} ${season.teams[String(m.away)]}`;
  };

  // Häufigste Trios über alle Saisons
  const trios = new Map<string, { season: Season; g: Goal; count: number }>();
  for (const { season, g } of goals) {
    if (!g.assist) continue;
    const key = `${season.meta.slug}-${g.pre!.player}-${g.assist.player}-${g.scorer}`;
    const t = trios.get(key) ?? { season, g, count: 0 };
    t.count++;
    trios.set(key, t);
  }

  // Spiele mit den meisten Pre-Assists
  const perMatch = new Map<string, { season: Season; g: Goal; count: number }>();
  for (const { season, g } of goals) {
    const key = `${season.meta.slug}-${g.match}`;
    const t = perMatch.get(key) ?? { season, g, count: 0 };
    t.count++;
    perMatch.set(key, t);
  }

  // Pre-Assists aus der eigenen Hälfte je Spieler
  const deep = new Map<string, { season: Season; row: PlayerRow; value: number }>();
  for (const { season, g } of goals) {
    if (g.pre!.start[0] >= 60) continue;
    const row = season.players.find((p) => p.id === g.pre!.player);
    if (!row) continue;
    const key = `${season.meta.slug}-${row.id}`;
    const d = deep.get(key) ?? { season, row, value: 0 };
    d.value++;
    deep.set(key, d);
  }

  // Doppelpass-Tore je Spieler und Saison
  const oneTwo = new Map<string, { season: Season; row: PlayerRow; value: number }>();
  for (const { season, g } of goals) {
    if (!isOneTwo(g)) continue;
    const row = season.players.find((p) => p.id === g.scorer);
    if (!row) continue;
    const key = `${season.meta.slug}-${row.id}`;
    const d = oneTwo.get(key) ?? { season, row, value: 0 };
    d.value++;
    oneTwo.set(key, d);
  }

  const txt = (key: string) => {
    const [title, unit, note] = TEXT[lang][key];
    return { title, unit, note };
  };

  return [
    {
      key: "meiste",
      ...txt("meiste"),
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssists }))),
    },
    {
      key: "quote",
      ...txt("quote"),
      entries: playerEntries(
        rows.filter((r) => r.row.minutes >= 900).map((r) => ({ ...r, value: (r.row.preAssists / r.row.minutes) * 90 })),
        2,
      ),
    },
    {
      key: "xpa",
      ...txt("xpa"),
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.xpa })), 2),
    },
    {
      key: "pech",
      ...txt("pech"),
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.xpa - r.row.preAssists })), 2),
    },
    {
      key: "xg",
      ...txt("xg"),
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssistXg })), 2),
    },
    {
      key: "architekten",
      ...txt("architekten"),
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssists - r.row.assists }))),
    },
    {
      key: "tief",
      ...txt("tief"),
      entries: playerEntries([...deep.values()]),
    },
    {
      key: "doppelpass",
      ...txt("doppelpass"),
      entries: playerEntries([...oneTwo.values()]),
      more: {
        // In der Saison des Spitzenreiters öffnen – dort gibt es die meisten Doppelpass-Tore zu sehen
        href: `${url(lang, "torketten")}?${(() => {
          const top = [...oneTwo.values()].sort((a, b) => b.value - a.value)[0];
          return top ? `liga=${top.season.meta.slug}&` : "";
        })()}doppelpass=1`,
        label: lang === "en" ? "Watch one-two goals" : "Doppelpass-Tore ansehen",
      },
    },
    {
      key: "laengster",
      ...txt("laengster"),
      entries: [...goals]
        .sort((a, b) => passLen(b.g) - passLen(a.g))
        .slice(0, 5)
        .map(({ season, g }) => ({
          value: fmt(passLen(g)),
          name: name(season, g.pre!.player),
          href: link(season, g.pre!.player),
          context: `${matchLabel(season, g)} · ${seasonLabel(season.meta)}`,
        })),
    },
    {
      key: "trio",
      ...txt("trio"),
      entries: [...trios.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ season, g, count }) => ({
          value: fmt(count),
          name: `${name(season, g.pre!.player)} › ${name(season, g.assist!.player)} › ${name(season, g.scorer)}`,
          href: url(lang, "verein", clubSlug(getSeason(season.meta.slug)!.teams[String(g.team)])),
          context: `${season.teams[String(g.team)]} · ${seasonLabel(season.meta)}`,
        })),
    },
    {
      key: "spiel",
      ...txt("spiel"),
      entries: [...perMatch.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ season, g, count }) => ({
          value: fmt(count),
          name: matchLabel(season, g),
          href: `${url(lang, "torketten")}?liga=${season.meta.slug}&tor=${g.id}`,
          context: `${new Date(season.matches[String(g.match)].date).toLocaleDateString(LOCALE[lang])} · ${seasonLabel(season.meta)}`,
        })),
    },
  ];
}
