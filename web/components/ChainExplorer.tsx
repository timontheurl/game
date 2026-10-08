"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ChainReplay from "./ChainReplay";
import ShareButton from "./ShareButton";
import { describePass, formatClock } from "@/lib/cards";
import { LOCALE, num, passLabel, t as tr, url, type Lang } from "@/lib/i18n";
import type { ChainData } from "@/app/daten/[file]/route";
import type { Goal } from "@/lib/data";
import LogoLoader from "./LogoLoader";

type Sort = "datum" | "xg" | "laenge";
const PAGE = 40;

const passLength = (g: Goal) => (g.pre ? Math.hypot(g.pre.end[0] - g.pre.start[0], g.pre.end[1] - g.pre.start[1]) : 0);

export default function ChainExplorer({
  seasons,
  lang = "de",
}: {
  seasons: { slug: string; label: string }[];
  lang?: Lang;
}) {
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
    fetch(`/daten/${lang === "en" ? "en-" : ""}${slug}.json`)
      .then((r) => r.json())
      .then((d: ChainData) => !cancelled && setData(d));
    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  const name = (id: number) => data?.names[String(id)] ?? "–";

  const passTypes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.goals.filter((g) => g.pre).map((g) => describePass(g.pre!)))].sort();
  }, [data]);

  const teams = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.goals.map((g) => g.team))]
      .map((id) => ({ id: String(id), name: data.teams[String(id)] }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
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
    return s ? <Link href={url(lang, "spieler", s)}>{name(id)}</Link> : <span>{name(id)}</span>;
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
          placeholder={tr(lang, "ex.searchChain")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={tr(lang, "search.label")}
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label={tr(lang, "table.team")}>
          <option value="alle">{tr(lang, "common.allTeams")}</option>
          {teams.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={passType} onChange={(e) => setPassType(e.target.value)} aria-label={tr(lang, "ex.passType")}>
          <option value="alle">{tr(lang, "ex.allPass")}</option>
          {passTypes.map((p) => (
            <option key={p} value={p}>
              {passLabel(lang, p)}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={tr(lang, "ex.sort")}>
          <option value="datum">{tr(lang, "ex.sortDate")}</option>
          <option value="xg">{tr(lang, "ex.sortXg")}</option>
          <option value="laenge">{tr(lang, "ex.sortLen")}</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyPre} onChange={(e) => setOnlyPre(e.target.checked)} />
          {tr(lang, "ex.onlyPre")}
        </label>
      </div>

      {!data ? (
        <LogoLoader label={tr(lang, "ex.loading")} />
      ) : (
        <div className="explorer-grid">
          <div className="explorer-list">
            <p className="explorer-count">
              <b>{goals.length}</b> {tr(lang, goals.length === 1 ? "ex.goal" : "ex.goals")}
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
                        {new Date(m.date).toLocaleDateString(LOCALE[lang], { day: "2-digit", month: "2-digit" })} ·{" "}
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
                        {g.pre && <span>{passLabel(lang, describePass(g.pre))}</span>}
                        <span>xG {num(lang, g.xg, 2)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {goals.length > limit && (
              <button type="button" className="more" onClick={() => setLimit((l) => l + PAGE)}>
                {tr(lang, "ex.more", { n: Math.min(PAGE, goals.length - limit) })}
              </button>
            )}
            {goals.length === 0 && <p className="empty">{tr(lang, "ex.none")}</p>}
          </div>

          {current && (
            <aside className="explorer-stage">
              <ChainReplay goal={current} names={data.names} lang={lang} />
              <div className="stage-info">
                <p className="ci-meta">
                  {(() => {
                    const m = data.matches[String(current.match)];
                    return `${new Date(m.date).toLocaleDateString(LOCALE[lang])} · ${data.teams[String(m.home)]} ${m.home_score}:${m.away_score} ${data.teams[String(m.away)]} · ${formatClock(current.period, current.minute)}`;
                  })()}
                </p>
                <ol className="chain">
                  {current.pre && (
                    <li className="chain-step pre">
                      <span className="chain-label">{tr(lang, "common.preAssist")}</span>
                      {playerLink(current.pre.player)}
                      <span className="chain-detail">{passLabel(lang, describePass(current.pre))}</span>
                    </li>
                  )}
                  {current.assist && (
                    <li className="chain-step assist">
                      <span className="chain-label">{tr(lang, "common.assist")}</span>
                      {playerLink(current.assist.player)}
                      <span className="chain-detail">{passLabel(lang, describePass(current.assist))}</span>
                    </li>
                  )}
                  <li className="chain-step shot">
                    <span className="chain-label">{tr(lang, "common.goal")}</span>
                    {playerLink(current.scorer)}
                    <span className="chain-detail">xG {num(lang, current.xg, 2)}</span>
                  </li>
                </ol>
                <Link href={url(lang, "verein", data.teamSlugs[String(current.team)])} className="text-link">
                  {data.teams[String(current.team)]}
                </Link>
                {(() => {
                  const m = data.matches[String(current.match)];
                  const label = `${data.teams[String(m.home)]} ${m.home_score}:${m.away_score} ${data.teams[String(m.away)]}`;
                  return (
                    <ShareButton
                      kind="goal"
                      small
                      lang={lang}
                      filename={`preassist-${current.id.slice(0, 8)}.png`}
                      title={label}
                      data={{
                        goal: current,
                        names: data.names,
                        matchLabel: label,
                        context: `${data.label} · ${formatClock(current.period, current.minute)}`,
                      }}
                    />
                  );
                })()}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
