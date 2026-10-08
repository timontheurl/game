"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerCard from "./PlayerCard";
import { LOCALE, t, type Lang, type TKey } from "@/lib/i18n";
import type { CompareEntry } from "@/lib/indexes";
import LogoLoader from "./LogoLoader";

interface Metric {
  label: TKey;
  get: (e: CompareEntry) => number;
  decimals?: number;
}

const per90 = (v: number, e: CompareEntry) => (e.minutes > 0 ? (v / e.minutes) * 90 : 0);

const METRICS: Metric[] = [
  { label: "common.preAssists", get: (e) => e.preAssists },
  { label: "cmp.pa90", get: (e) => per90(e.preAssists, e), decimals: 2 },
  { label: "cmp.xpa", get: (e) => e.xpa, decimals: 2 },
  { label: "table.paxg", get: (e) => e.preAssistXg, decimals: 2 },
  { label: "common.assists", get: (e) => e.assists },
  { label: "common.goals", get: (e) => e.goals },
  { label: "cmp.inv", get: (e) => e.involvements },
  { label: "cmp.inv90", get: (e) => per90(e.involvements, e), decimals: 2 },
  { label: "cmp.apps", get: (e) => e.matches },
  { label: "common.minutes", get: (e) => e.minutes },
];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Picker({
  entries,
  value,
  onPick,
  label,
  lang,
}: {
  entries: CompareEntry[];
  value: CompareEntry | undefined;
  onPick: (e: CompareEntry) => void;
  label: string;
  lang: Lang;
}) {
  const [q, setQ] = useState("");
  const results = q.trim() ? entries.filter((e) => norm(e.name).includes(norm(q.trim()))).slice(0, 7) : [];
  return (
    <div className="picker">
      <input
        type="search"
        placeholder={t(lang, "cmp.search", { label })}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={label}
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
      <div className="picker-card">{value && <PlayerCard card={value} size="lg" lang={lang} />}</div>
    </div>
  );
}

export default function PlayerCompare({ lang = "de" }: { lang?: Lang }) {
  const fmt = (v: number, d = 0) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const [entries, setEntries] = useState<CompareEntry[] | null>(null);
  const [aKey, setAKey] = useState<string | null>(null);
  const [bKey, setBKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(lang === "en" ? "/daten/spieler-en.json" : "/daten/spieler.json")
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
  }, [lang]);

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

  if (!entries) return <LogoLoader label={t(lang, "cmp.loading")} />;

  let winsA = 0;
  let winsB = 0;
  const rows = a && b
    ? METRICS.map((m) => {
        const va = m.get(a);
        const vb = m.get(b);
        if (m.label !== "common.minutes" && m.label !== "cmp.apps") {
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
          {t(lang, "cmp.random")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setAKey(bKey);
            setBKey(aKey);
          }}
        >
          {t(lang, "cmp.swap")}
        </button>
      </div>

      <div className="compare-head">
        <Picker entries={entries} value={a} onPick={(e) => setAKey(e.key)} label={t(lang, "cmp.p1")} lang={lang} />
        <div className="compare-score" aria-live="polite">
          <span className={winsA > winsB ? "is-win" : ""}>{winsA}</span>
          <small>:</small>
          <span className={winsB > winsA ? "is-win" : ""}>{winsB}</span>
          <em>{t(lang, "cmp.categories")}</em>
        </div>
        <Picker entries={entries} value={b} onPick={(e) => setBKey(e.key)} label={t(lang, "cmp.p2")} lang={lang} />
      </div>

      {a && b && (
        <div className="compare-bars">
          {rows.map(({ m, va, vb, pa, pb }) => (
            <div key={m.label} className="cb-row">
              <span className={`cb-val ${va > vb ? "is-win" : ""}`}>{fmt(va, m.decimals)}</span>
              <span className="cb-bar left">
                <i style={{ width: `${pa}%` }} />
              </span>
              <span className="cb-label">{t(lang, m.label)}</span>
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
