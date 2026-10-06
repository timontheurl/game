"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ChainReplay from "./ChainReplay";
import { clubSlug, describePass, formatClock } from "@/lib/cards";
import type { ChainData } from "@/app/daten/[file]/route";
import type { Goal } from "@/lib/data";

type Sort = "datum" | "xg" | "laenge";
const PAGE = 40;

const passLength = (g: Goal) => (g.pre ? Math.hypot(g.pre.end[0] - g.pre.start[0], g.pre.end[1] - g.pre.start[1]) : 0);

export default function ChainExplorer({ seasons }: { seasons: { slug: string; label: string }[] }) {
  const [slug, setSlug] = useState(seasons[0].slug);
  const [data, setData] = useState<ChainData | null>(null);
  const [team, setTeam] = useState("alle");
  const [passType, setPassType] = useState("alle");
  const [onlyPre, setOnlyPre] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("datum");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);

  // Liga und Tor aus der URL übernehmen (teilbare Links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const liga = params.get("liga");
    if (liga && seasons.some((s) => s.slug === liga)) setSlug(liga);
    const tor = params.get("tor");
    if (tor) setSelected(tor);
  }, [seasons]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/daten/${slug}.json`)
      .then((r) => r.json())
      .then((d: ChainData) => !cancelled && setData(d));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const name = (id: number) => data?.names[String(id)] ?? "–";

  const passTypes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.goals.filter((g) => g.pre).map((g) => describePass(g.pre!)))].sort();
  }, [data]);

  const teams = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.goals.map((g) => g.team))]
      .map((id) => ({ id: String(id), name: data.teams[String(id)] }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [data]);

  const goals = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.goals.filter((g) => {
      if (onlyPre && !g.pre) return false;
      if (team !== "alle" && String(g.team) !== team) return false;
      if (passType !== "alle" && (!g.pre || describePass(g.pre) !== passType)) return false;
      if (q) {
        const ids = [g.scorer, g.assist?.player, g.pre?.player].filter((x): x is number => x !== undefined);
        if (!ids.some((id) => data.names[String(id)]?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const date = (g: Goal) => data.matches[String(g.match)].date;
    return list.sort((a, b) =>
      sort === "xg"
        ? b.xg - a.xg
        : sort === "laenge"
          ? passLength(b) - passLength(a)
          : date(b).localeCompare(date(a)) || b.minute - a.minute,
    );
  }, [data, onlyPre, team, passType, query, sort]);

  useEffect(() => setLimit(PAGE), [slug, team, passType, onlyPre, query, sort]);

  const current = goals.find((g) => g.id === selected) ?? goals[0];

  const select = (g: Goal) => {
    setSelected(g.id);
    const url = new URL(window.location.href);
    url.searchParams.set("liga", slug);
    url.searchParams.set("tor", g.id);
    window.history.replaceState(null, "", url);
    // Auf dem Handy liegt die Animation über der Liste – dorthin scrollen
    if (window.innerWidth < 900) {
      document.querySelector(".explorer-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const playerLink = (id: number) => {
    const s = data?.slugs[String(id)];
    return s ? <Link href={`/spieler/${s}/`}>{name(id)}</Link> : <span>{name(id)}</span>;
  };

  return (
    <div className="explorer">
      <div className="pills">
        {seasons.map((s) => (
          <button
            key={s.slug}
            type="button"
            className={`pill ${s.slug === slug ? "is-active" : ""}`}
            onClick={() => {
              setSlug(s.slug);
              setTeam("alle");
              setPassType("alle");
              setSelected(null);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Spieler in der Kette suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Spieler suchen"
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
          <option value="alle">Alle Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={passType} onChange={(e) => setPassType(e.target.value)} aria-label="Art des Pre-Assists">
          <option value="alle">Alle Pass-Arten</option>
          {passTypes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sortierung">
          <option value="datum">Neueste zuerst</option>
          <option value="xg">Größte Chance (xG)</option>
          <option value="laenge">Längster Pre-Assist</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyPre} onChange={(e) => setOnlyPre(e.target.checked)} />
          nur mit Pre-Assist
        </label>
      </div>

      {!data ? (
        <p className="empty">Lade Torketten …</p>
      ) : (
        <div className="explorer-grid">
          <div className="explorer-list">
            <p className="explorer-count">
              <b>{goals.length}</b> {goals.length === 1 ? "Tor" : "Tore"}
            </p>
            <ul>
              {goals.slice(0, limit).map((g) => {
                const m = data.matches[String(g.match)];
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`chain-item ${current?.id === g.id ? "is-active" : ""}`}
                      onClick={() => select(g)}
                    >
                      <span className="ci-meta">
                        {new Date(m.date).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })} ·{" "}
                        {data.teams[String(m.home)]} {m.home_score}:{m.away_score} {data.teams[String(m.away)]} ·{" "}
                        {formatClock(g.period, g.minute)}
                      </span>
                      <span className="chain-names">
                        {g.pre && (
                          <>
                            <span className="c-pre">{name(g.pre.player)}</span>
                            <span className="c-sep">›</span>
                          </>
                        )}
                        {g.assist && (
                          <>
                            <span className="c-ast">{name(g.assist.player)}</span>
                            <span className="c-sep">›</span>
                          </>
                        )}
                        <span className="c-goal">{name(g.scorer)}</span>
                      </span>
                      <span className="ci-tags">
                        {g.pre && <span>{describePass(g.pre)}</span>}
                        <span>xG {g.xg.toFixed(2).replace(".", ",")}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {goals.length > limit && (
              <button type="button" className="more" onClick={() => setLimit((l) => l + PAGE)}>
                Weitere {Math.min(PAGE, goals.length - limit)} Tore laden
              </button>
            )}
            {goals.length === 0 && <p className="empty">Keine Tore für diese Filter.</p>}
          </div>

          {current && (
            <aside className="explorer-stage">
              <ChainReplay goal={current} names={data.names} />
              <div className="stage-info">
                <p className="ci-meta">
                  {(() => {
                    const m = data.matches[String(current.match)];
                    return `${new Date(m.date).toLocaleDateString("de-AT")} · ${data.teams[String(m.home)]} ${m.home_score}:${m.away_score} ${data.teams[String(m.away)]} · ${formatClock(current.period, current.minute)}`;
                  })()}
                </p>
                <ol className="chain">
                  {current.pre && (
                    <li className="chain-step pre">
                      <span className="chain-label">Pre-Assist</span>
                      {playerLink(current.pre.player)}
                      <span className="chain-detail">{describePass(current.pre)}</span>
                    </li>
                  )}
                  {current.assist && (
                    <li className="chain-step assist">
                      <span className="chain-label">Assist</span>
                      {playerLink(current.assist.player)}
                      <span className="chain-detail">{describePass(current.assist)}</span>
                    </li>
                  )}
                  <li className="chain-step shot">
                    <span className="chain-label">Tor</span>
                    {playerLink(current.scorer)}
                    <span className="chain-detail">xG {current.xg.toFixed(2).replace(".", ",")}</span>
                  </li>
                </ol>
                <Link href={`/verein/${clubSlug(data.teams[String(current.team)])}/`} className="text-link">
                  {data.teams[String(current.team)]}
                </Link>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
