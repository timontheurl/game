import { clubSlug } from "./cards";
import { getSeasons, playerSlug, seasonLabel, type Goal, type PlayerRow, type Season } from "./data";

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
}

const fmt = (n: number, d = 0) => n.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });

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
      href: `/spieler/${row.slug}/`,
      context: `${season.teams[String(row.team)]} · ${seasonLabel(season.meta)}`,
    }));
}

const passLen = (g: Goal) => (g.pre ? Math.hypot(g.pre.end[0] - g.pre.start[0], g.pre.end[1] - g.pre.start[1]) * YARD : 0);

export function getRecords(): RecordList[] {
  // Saisons mit nur einem Team würden Vergleiche verzerren – Rekorde nur aus vollständigen Saisons
  const seasons = getSeasons().filter((s) => s.meta.coverage === "full");
  const rows = seasons.flatMap((season) => season.players.map((row) => ({ season, row })));
  const goals = seasons.flatMap((season) => season.goals.filter((g) => g.pre).map((g) => ({ season, g })));
  const name = (season: Season, id: number) => season.names[String(id)];
  const link = (season: Season, id: number) => {
    const slug = playerSlug(season, id);
    return slug ? `/spieler/${slug}/` : null;
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

  return [
    {
      key: "meiste",
      title: "Meiste Pre-Assists",
      unit: "Pre-Assists",
      note: "In einer Saison.",
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssists }))),
    },
    {
      key: "quote",
      title: "Beste Quote",
      unit: "pro 90 Min.",
      note: "Mindestens 900 Spielminuten.",
      entries: playerEntries(
        rows.filter((r) => r.row.minutes >= 900).map((r) => ({ ...r, value: (r.row.preAssists / r.row.minutes) * 90 })),
        2,
      ),
    },
    {
      key: "xpa",
      title: "Höchster xPA",
      unit: "erwartete Pre-Assists",
      note: "xG aller Abschlüsse nach eigenen Pre-Assists – misst die Vorbereitung, unabhängig vom Abschluss.",
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.xpa })), 2),
    },
    {
      key: "pech",
      title: "Pech im Abschluss",
      unit: "xPA über Pre-Assists",
      note: "Erwartete minus echte Pre-Assists: viele gute Vorbereitungen, die Mitspieler trafen nicht.",
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.xpa - r.row.preAssists })), 2),
    },
    {
      key: "xg",
      title: "Größte Chancen",
      unit: "Pre-Assist xG",
      note: "Summe der Torwahrscheinlichkeit nach eigenen Pre-Assists.",
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssistXg })), 2),
    },
    {
      key: "architekten",
      title: "Stille Architekten",
      unit: "mehr als Assists",
      note: "Pre-Assists minus eigene Assists – die unterschätzten Vorbereiter.",
      entries: playerEntries(rows.map((r) => ({ ...r, value: r.row.preAssists - r.row.assists }))),
    },
    {
      key: "tief",
      title: "Aus der eigenen Hälfte",
      unit: "Pre-Assists",
      note: "Pre-Assists, die in der eigenen Spielhälfte gespielt wurden.",
      entries: playerEntries([...deep.values()]),
    },
    {
      key: "laengster",
      title: "Längster Pre-Assist",
      unit: "Meter",
      note: "Gemessen vom Abspiel bis zur Annahme.",
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
      title: "Eingespieltestes Trio",
      unit: "Tore",
      note: "Immer gleiche Kette: Pre-Assist › Assist › Tor.",
      entries: [...trios.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ season, g, count }) => ({
          value: fmt(count),
          name: `${name(season, g.pre!.player)} › ${name(season, g.assist!.player)} › ${name(season, g.scorer)}`,
          href: `/verein/${clubSlug(season.teams[String(g.team)])}/`,
          context: `${season.teams[String(g.team)]} · ${seasonLabel(season.meta)}`,
        })),
    },
    {
      key: "spiel",
      title: "Spiel mit den meisten",
      unit: "Pre-Assists",
      note: "Tore mit Pre-Assist in einem einzigen Spiel (beide Teams).",
      entries: [...perMatch.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ season, g, count }) => ({
          value: fmt(count),
          name: matchLabel(season, g),
          href: `/torketten/?liga=${season.meta.slug}&tor=${g.id}`,
          context: `${new Date(season.matches[String(g.match)].date).toLocaleDateString("de-AT")} · ${seasonLabel(season.meta)}`,
        })),
    },
  ];
}
