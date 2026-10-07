"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerCard from "./PlayerCard";
import type { CompareEntry } from "@/app/daten/spieler.json/route";

interface Metric {
  label: string;
  get: (e: CompareEntry) => number;
  decimals?: number;
}

const per90 = (v: number, e: CompareEntry) => (e.minutes > 0 ? (v / e.minutes) * 90 : 0);

const METRICS: Metric[] = [
  { label: "Pre-Assists", get: (e) => e.preAssists },
  { label: "Pre-Assists pro 90", get: (e) => per90(e.preAssists, e), decimals: 2 },
  { label: "xPA (erwartete Pre-Assists)", get: (e) => e.xpa, decimals: 2 },
  { label: "Pre-Assist xG", get: (e) => e.preAssistXg, decimals: 2 },
  { label: "Assists", get: (e) => e.assists },
  { label: "Tore", get: (e) => e.goals },
  { label: "Torbeteiligungen", get: (e) => e.involvements },
  { label: "Beteiligungen pro 90", get: (e) => per90(e.involvements, e), decimals: 2 },
  { label: "Einsätze", get: (e) => e.matches },
  { label: "Minuten", get: (e) => e.minutes },
];

const fmt = (v: number, d = 0) => v.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Picker({
  entries,
  value,
  onPick,
  label,
}: {
  entries: CompareEntry[];
  value: CompareEntry | undefined;
  onPick: (e: CompareEntry) => void;
  label: string;
}) {
  const [q, setQ] = useState("");
  const results = q.trim() ? entries.filter((e) => norm(e.name).includes(norm(q.trim()))).slice(0, 7) : [];
  return (
    <div className="picker">
      <input
        type="search"
        placeholder={`${label}: Spieler suchen …`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={`${label} wählen`}
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setQ("");
                }}
              >
                <span className="sr-pos">{r.position ?? "–"}</span>
                <span className="sr-name">
                  {r.name}
                  <small>
                    {r.team} · {r.season}
                  </small>
                </span>
                <span className="sr-pa">{r.preAssists}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="picker-card">{value && <PlayerCard card={value} size="lg" />}</div>
    </div>
  );
}

export default function PlayerCompare() {
  const [entries, setEntries] = useState<CompareEntry[] | null>(null);
  const [aKey, setAKey] = useState<string | null>(null);
  const [bKey, setBKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/daten/spieler.json")
      .then((r) => r.json())
      .then((list: CompareEntry[]) => {
        setEntries(list);
        const params = new URLSearchParams(window.location.search);
        const has = (k: string | null) => k && list.some((e) => e.key === k);
        const a = params.get("a");
        const b = params.get("b");
        // Standard-Duell: die Nummer 1 der ersten zwei vollen Ligen
        const bySeason = (slug: string) => list.find((e) => e.seasonSlug === slug)?.key ?? null;
        setAKey(has(a) ? a : bySeason("premier-league-2015-16"));
        setBKey(has(b) ? b : bySeason("la-liga-2015-16"));
      });
  }, []);

  useEffect(() => {
    if (!aKey || !bKey) return;
    const url = new URL(window.location.href);
    url.searchParams.set("a", aKey);
    url.searchParams.set("b", bKey);
    window.history.replaceState(null, "", url);
  }, [aKey, bKey]);

  const a = useMemo(() => entries?.find((e) => e.key === aKey), [entries, aKey]);
  const b = useMemo(() => entries?.find((e) => e.key === bKey), [entries, bKey]);

  const randomDuel = () => {
    if (!entries) return;
    const pool = entries.filter((e) => e.preAssists >= 4);
    const pick = () => pool[Math.floor(Math.random() * pool.length)].key;
    const first = pick();
    let second = pick();
    while (second === first && pool.length > 1) second = pick();
    setAKey(first);
    setBKey(second);
  };

  if (!entries) return <p className="empty">Lade Spieler …</p>;

  let winsA = 0;
  let winsB = 0;
  const rows = a && b
    ? METRICS.map((m) => {
        const va = m.get(a);
        const vb = m.get(b);
        if (m.label !== "Minuten" && m.label !== "Einsätze") {
          if (va > vb) winsA++;
          else if (vb > va) winsB++;
        }
        const max = Math.max(va, vb) || 1;
        return { m, va, vb, pa: (va / max) * 100, pb: (vb / max) * 100 };
      })
    : [];

  return (
    <div className="compare">
      <div className="compare-actions">
        <button type="button" className="btn" onClick={randomDuel}>
          Zufallsduell
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setAKey(bKey);
            setBKey(aKey);
          }}
        >
          ⇄ Seiten tauschen
        </button>
      </div>

      <div className="compare-head">
        <Picker entries={entries} value={a} onPick={(e) => setAKey(e.key)} label="Spieler 1" />
        <div className="compare-score" aria-live="polite">
          <span className={winsA > winsB ? "is-win" : ""}>{winsA}</span>
          <small>:</small>
          <span className={winsB > winsA ? "is-win" : ""}>{winsB}</span>
          <em>Kategorien</em>
        </div>
        <Picker entries={entries} value={b} onPick={(e) => setBKey(e.key)} label="Spieler 2" />
      </div>

      {a && b && (
        <div className="compare-bars">
          {rows.map(({ m, va, vb, pa, pb }) => (
            <div key={m.label} className="cb-row">
              <span className={`cb-val ${va > vb ? "is-win" : ""}`}>{fmt(va, m.decimals)}</span>
              <span className="cb-bar left">
                <i style={{ width: `${pa}%` }} />
              </span>
              <span className="cb-label">{m.label}</span>
              <span className="cb-bar right">
                <i style={{ width: `${pb}%` }} />
              </span>
              <span className={`cb-val ${vb > va ? "is-win" : ""}`}>{fmt(vb, m.decimals)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
