"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { clubSlug } from "@/lib/cards";
import type { PlayerRow } from "@/lib/data";
import { LOCALE, num, t, url, type Lang, type TKey } from "@/lib/i18n";

type SortKey = "preAssists" | "xpa" | "assists" | "goals" | "involvements" | "preAssistXg" | "minutes";

const PAGE_SIZE = 50;

const COLUMNS: { key: SortKey; label: TKey | "xPA"; title: TKey }[] = [
  { key: "preAssists", label: "common.preAssists", title: "table.pa.title" },
  { key: "assists", label: "common.assists", title: "table.ast.title" },
  { key: "goals", label: "common.goals", title: "table.goals.title" },
  { key: "involvements", label: "table.involved", title: "table.inv.title" },
  { key: "xpa", label: "xPA", title: "table.xpa.title" },
  { key: "preAssistXg", label: "table.paxg", title: "table.paxg.title" },
  { key: "minutes", label: "common.minutes", title: "table.min.title" },
];

export default function RankingTable({
  players,
  teams,
  teamSlugs,
  hideTeam = false,
  lang = "de",
}: {
  players: PlayerRow[];
  teams: Record<string, string>;
  /** Vereins-Adresse je Team-ID; fehlt sie, wird sie aus dem Namen gebildet */
  teamSlugs?: Record<string, string>;
  hideTeam?: boolean;
  lang?: Lang;
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
        .sort((a, b) => a.name.localeCompare(b.name, lang)),
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

  // Umsortieren sichtbar machen (FLIP): Zeilen gleiten an ihren neuen Platz,
  // wer deutlich steigt, leuchtet kurz grün, wer fällt, kurz rot – mit Pfeil und Anzahl Plätze.
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const before = useRef<{ tops: Map<number, number>; order: Map<number, number>; key: string } | null>(null);
  const [moves, setMoves] = useState<Map<number, number>>(new Map());
  const moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const animKey = `${sort}|${per90}|${minMinutes}|${team}`;

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const trs = [...body.querySelectorAll<HTMLTableRowElement>("tr[data-id]")];
    const tops = new Map<number, number>();
    const order = new Map<number, number>();
    trs.forEach((tr, i) => {
      const id = Number(tr.dataset.id);
      tops.set(id, tr.offsetTop);
      order.set(id, i);
    });
    const prev = before.current;
    before.current = { tops, order, key: animKey };
    // Nur bei neuer Sortierung oder neuem Filter animieren, nicht beim Tippen in der Suche
    if (!prev || prev.key === animKey || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const moved = new Map<number, number>();
    for (const tr of trs) {
      const id = Number(tr.dataset.id);
      const oldTop = prev.tops.get(id);
      if (oldTop === undefined) {
        tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" });
        continue;
      }
      const dy = oldTop - tr.offsetTop;
      if (dy) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      const delta = prev.order.get(id)! - order.get(id)!;
      if (Math.abs(delta) >= 3) moved.set(id, delta);
    }
    setMoves(moved);
    clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => setMoves(new Map()), 2600);
  }, [rows, showAll, animKey]);

  useLayoutEffect(() => () => clearTimeout(moveTimer.current), []);

  const fmt = (p: PlayerRow, key: SortKey) => {
    const v = value(p, key);
    if (key === "minutes") return v.toLocaleString(LOCALE[lang]);
    if (per90 || key === "preAssistXg" || key === "xpa") return num(lang, v, 2);
    return String(v);
  };

  let rank = 0;
  let prev: number | null = null;

  return (
    <div className="ranking">
      <div className="filters">
        <input
          type="search"
          placeholder={t(lang, "table.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t(lang, "search.label")}
        />
        {!hideTeam && (
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label={t(lang, "table.team")}>
            <option value="alle">{t(lang, "common.allTeams")}</option>
            {teamOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={minMinutes}
          onChange={(e) => setMinMinutes(Number(e.target.value))}
          aria-label={t(lang, "common.minutes")}
        >
          <option value={0}>{t(lang, "table.minutesAll")}</option>
          {[450, 900, 1800].map((n) => (
            <option key={n} value={n}>
              {t(lang, "table.minutesFrom", { n: n.toLocaleString(LOCALE[lang]) })}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={per90} onChange={(e) => setPer90(e.target.checked)} />
          {t(lang, "table.per90")}
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>{t(lang, "table.player")}</th>
              {!hideTeam && <th className="hide-sm">{t(lang, "table.team")}</th>}
              {COLUMNS.map((c) => (
                <th key={c.key} className={`num ${["minutes", "preAssistXg", "involvements", "xpa"].includes(c.key) ? "hide-sm" : ""}`}>
                  <button
                    type="button"
                    title={t(lang, c.title)}
                    className={sort === c.key ? "active" : ""}
                    onClick={() => setSort(c.key)}
                  >
                    {c.label === "xPA" ? "xPA" : t(lang, c.label)}
                    {sort === c.key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {(showAll ? rows : rows.slice(0, PAGE_SIZE)).map((p, i) => {
              const v = value(p, sort);
              if (v !== prev) rank = i + 1;
              prev = v;
              return (
                <tr
                  key={p.id}
                  data-id={p.id}
                  className={moves.has(p.id) ? (moves.get(p.id)! > 0 ? "is-up" : "is-down") : undefined}
                >
                  <td className="num muted">{rank}</td>
                  <td className="name">
                    <Link href={url(lang, "spieler", p.slug)}>{p.name}</Link>
                    {moves.has(p.id) && (
                      <span className="rank-move" aria-hidden="true">
                        {moves.get(p.id)! > 0 ? "▲" : "▼"} {Math.abs(moves.get(p.id)!)}
                      </span>
                    )}
                    {!hideTeam && <div className="sub show-sm">{teams[String(p.team)]}</div>}
                  </td>
                  {!hideTeam && (
                    <td className="hide-sm muted">
                      <Link href={url(lang, "verein", teamSlugs?.[String(p.team)] ?? clubSlug(teams[String(p.team)]))} className="team-link">
                        {teams[String(p.team)]}
                      </Link>
                    </td>
                  )}
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`num ${c.key === sort ? "sorted" : ""} ${["minutes", "preAssistXg", "involvements", "xpa"].includes(c.key) ? "hide-sm" : ""}`}
                    >
                      {fmt(p, c.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">{t(lang, "table.none")}</p>}
        {!showAll && rows.length > PAGE_SIZE && (
          <button type="button" className="more" onClick={() => setShowAll(true)}>
            {t(lang, "table.showAll", { n: rows.length })}
          </button>
        )}
      </div>
    </div>
  );
}
