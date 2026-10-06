"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { clubSlug } from "@/lib/cards";
import type { PlayerRow } from "@/lib/data";

type SortKey = "preAssists" | "assists" | "goals" | "involvements" | "preAssistXg" | "minutes";

const PAGE_SIZE = 50;

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: "preAssists", label: "Pre-Assists", title: "Pass, der zum Assist führte" },
  { key: "assists", label: "Assists", title: "Letzter Pass vor dem Tor" },
  { key: "goals", label: "Tore", title: "Tore ohne Eigentore" },
  { key: "involvements", label: "Beteiligt", title: "Tore + Assists + Pre-Assists" },
  { key: "preAssistXg", label: "Pre-Assist xG", title: "Summe der Expected Goals der Abschlüsse nach eigenen Pre-Assists" },
  { key: "minutes", label: "Minuten", title: "Gespielte Minuten" },
];

export default function RankingTable({
  players,
  teams,
  hideTeam = false,
}: {
  players: PlayerRow[];
  teams: Record<string, string>;
  hideTeam?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("preAssists");
  const [team, setTeam] = useState("alle");
  const [query, setQuery] = useState("");
  const [per90, setPer90] = useState(false);
  const [minMinutes, setMinMinutes] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const teamOptions = useMemo(
    () =>
      [...new Set(players.map((p) => p.team))]
        .map((id) => ({ id: String(id), name: teams[String(id)] }))
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [players, teams],
  );

  const value = (p: PlayerRow, key: SortKey) =>
    per90 && key !== "minutes" ? (p.minutes > 0 ? (p[key] / p.minutes) * 90 : 0) : p[key];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => team === "alle" || String(p.team) === team)
      .filter((p) => p.minutes >= minMinutes)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q))
      .sort((a, b) => value(b, sort) - value(a, sort) || b.preAssists - a.preAssists || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, team, query, sort, per90, minMinutes]);

  const fmt = (p: PlayerRow, key: SortKey) => {
    const v = value(p, key);
    if (key === "minutes") return v.toLocaleString("de-AT");
    if (per90 || key === "preAssistXg") return v.toFixed(2).replace(".", ",");
    return String(v);
  };

  let rank = 0;
  let prev: number | null = null;

  return (
    <div className="ranking">
      <div className="filters">
        <input
          type="search"
          placeholder="Spieler suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Spieler suchen"
        />
        {!hideTeam && (
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team filtern">
            <option value="alle">Alle Teams</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={minMinutes}
          onChange={(e) => setMinMinutes(Number(e.target.value))}
          aria-label="Mindestminuten"
        >
          <option value={0}>Alle Minuten</option>
          <option value={450}>ab 450 Min.</option>
          <option value={900}>ab 900 Min.</option>
          <option value={1800}>ab 1.800 Min.</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={per90} onChange={(e) => setPer90(e.target.checked)} />
          pro 90 Minuten
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Spieler</th>
              {!hideTeam && <th className="hide-sm">Team</th>}
              {COLUMNS.map((c) => (
                <th key={c.key} className={`num ${["minutes", "preAssistXg", "involvements"].includes(c.key) ? "hide-sm" : ""}`}>
                  <button
                    type="button"
                    title={c.title}
                    className={sort === c.key ? "active" : ""}
                    onClick={() => setSort(c.key)}
                  >
                    {c.label}
                    {sort === c.key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(showAll ? rows : rows.slice(0, PAGE_SIZE)).map((p, i) => {
              const v = value(p, sort);
              if (v !== prev) rank = i + 1;
              prev = v;
              return (
                <tr key={p.id}>
                  <td className="num muted">{rank}</td>
                  <td className="name">
                    <Link href={`/spieler/${p.slug}/`}>{p.name}</Link>
                    {!hideTeam && <div className="sub show-sm">{teams[String(p.team)]}</div>}
                  </td>
                  {!hideTeam && (
                    <td className="hide-sm muted">
                      <Link href={`/verein/${clubSlug(teams[String(p.team)])}/`} className="team-link">
                        {teams[String(p.team)]}
                      </Link>
                    </td>
                  )}
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`num ${c.key === sort ? "sorted" : ""} ${["minutes", "preAssistXg", "involvements"].includes(c.key) ? "hide-sm" : ""}`}
                    >
                      {fmt(p, c.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Keine Spieler gefunden.</p>}
        {!showAll && rows.length > PAGE_SIZE && (
          <button type="button" className="more" onClick={() => setShowAll(true)}>
            Alle {rows.length} Spieler anzeigen
          </button>
        )}
      </div>
    </div>
  );
}
