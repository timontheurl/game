"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import ClubBadge from "./ClubBadge";
import { Flag } from "./PlayerCard";
import { pick, t, url, type Lang } from "@/lib/i18n";

export interface ExplorerClub {
  slug: string;
  name: string;
  flag: string | null;
  pre: number;
  goals: number;
  leader: { name: string; pa: number } | null;
}

export interface ExplorerSeason {
  slug: string;
  label: string;
  clubs: ExplorerClub[];
}

export interface ExplorerLeague {
  key: string;
  name: string;
  flag: string;
  seasons: ExplorerSeason[];
}

export interface ExplorerCountry {
  iso: string; // Ländernummer der Weltkarte (ISO 3166-1 numerisch)
  /** Punkt für Beschriftung und Drehen [Länge, Breite] – Schwerpunkte stimmen bei Ländern mit Überseegebieten nicht */
  center: [number, number];
  name: string;
  flag: string;
  leagues: ExplorerLeague[];
}

type Rotation = [number, number];
const EUROPE: Rotation = [-8, -48];
const SIZE = 520;
const ZOOMS = [1, 1.6, 2.4, 3.4];
const START_ZOOM = 2;

// Beschriftung neben dem Punkt, damit sich Nachbarländer nicht überdecken
const LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  "826": { dx: -9, dy: 4, anchor: "end" },
  "528": { dx: -2, dy: -10, anchor: "end" },
  "276": { dx: 9, dy: -2, anchor: "start" },
  "040": { dx: 9, dy: 10, anchor: "start" },
  "250": { dx: -9, dy: 4, anchor: "end" },
  "724": { dx: 0, dy: 20, anchor: "middle" },
  "380": { dx: 9, dy: 8, anchor: "start" },
  "620": { dx: -9, dy: 4, anchor: "end" },
  "756": { dx: -6, dy: 16, anchor: "end" },
};

function useCountries() {
  const [world, setWorld] = useState<Feature<Geometry, { name: string }>[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/geo/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
        const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
        if (alive) setWorld(fc.features);
      })
      .catch(() => alive && setWorld([]));
    return () => {
      alive = false;
    };
  }, []);
  return world;
}

function Globe({
  countries,
  selected,
  onSelect,
  lang,
}: {
  countries: ExplorerCountry[];
  selected: string | null;
  onSelect: (iso: string | null) => void;
  lang: Lang;
}) {
  const world = useCountries();
  const [rotation, setRotation] = useState<Rotation>(EUROPE);
  const [zoomStep, setZoomStep] = useState(START_ZOOM);
  const zoom = ZOOMS[zoomStep];
  const [hover, setHover] = useState<string | null>(null);
  const rotRef = useRef(rotation);
  rotRef.current = rotation;
  const anim = useRef(0);
  const drag = useRef<{ x: number; y: number; r: Rotation; moved: boolean } | null>(null);

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso, c])), [countries]);
  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale((SIZE / 2 - 6) * zoom)
        .translate([SIZE / 2, SIZE / 2])
        .rotate(rotation)
        .clipAngle(90),
    [rotation, zoom],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  // Sanft zu einem Punkt drehen (Längen-/Breitengrad)
  const flyTo = useCallback((target: Rotation) => {
    cancelAnimationFrame(anim.current);
    const from = rotRef.current;
    // kürzester Weg um die Erde
    const dLon = ((((target[0] - from[0]) % 360) + 540) % 360) - 180;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRotation([from[0] + dLon, target[1]]);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setRotation([from[0] + dLon * e, from[1] + (target[1] - from[1]) * e]);
      if (k < 1) anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // Beim Auswählen (auch über die Knöpfe) zum Land drehen; ohne Auswahl zurück nach Europa
  useEffect(() => {
    if (!world) return;
    if (!selected) {
      flyTo(EUROPE);
      return;
    }
    const c = countries.find((x) => x.iso === selected);
    if (!c) return;
    flyTo([-c.center[0], -c.center[1]]);
  }, [selected, world, flyTo, countries]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    cancelAnimationFrame(anim.current);
    drag.current = { x: e.clientX, y: e.clientY, r: rotRef.current, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId);
    d.moved = true;
    const k = 180 / (SIZE / 2) / 1.6 / zoom;
    setRotation([d.r[0] + dx * k, Math.max(-80, Math.min(80, d.r[1] - dy * k))]);
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    // Klick: Land unter dem Zeiger finden
    const id = (e.target as Element).getAttribute("data-iso");
    if (id && byIso.has(id)) onSelect(id === selected ? null : id);
  };

  const center: [number, number] = [-rotation[0], -rotation[1]];
  const hoverCountry = hover ? byIso.get(hover) : null;

  return (
    <div className="globe-wrap">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="globe"
        role="img"
        aria-label={pick(lang, "Weltkugel mit den Ländern, in denen es Ligen gibt", "Globe with the countries that have leagues")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <radialGradient id="globe-shade" cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#262a31" />
            <stop offset="1" stopColor="#121417" />
          </radialGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={(SIZE / 2 - 6) * zoom} className="globe-sphere" fill="url(#globe-shade)" />
        <path d={path(geoGraticule10()) ?? ""} className="globe-graticule" />
        {world?.map((f) => {
          const iso = String(f.id);
          const c = byIso.get(iso);
          const live = c?.leagues.some((l) => l.seasons.length > 0);
          const cls = c ? (live ? "is-live" : "is-planned") : "";
          return (
            <path
              key={iso + f.properties.name}
              d={path(f) ?? ""}
              data-iso={iso}
              className={`globe-country ${cls} ${selected === iso ? "is-selected" : ""}`}
              onPointerEnter={() => c && setHover(iso)}
              onPointerLeave={() => setHover((h) => (h === iso ? null : h))}
            />
          );
        })}
        {/* Namen der Länder mit Ligen, wenn sie auf der Vorderseite liegen */}
        {world &&
          countries.map((c) => {
            if (geoDistance(c.center, center) > Math.PI / 2 - 0.15) return null;
            const p = projection(c.center);
            if (!p || p[0] < 0 || p[0] > SIZE || p[1] < 0 || p[1] > SIZE) return null;
            const l = LABEL[c.iso] ?? { dx: 0, dy: -9, anchor: "middle" as const };
            return (
              <g key={c.iso} className={`globe-label ${selected === c.iso ? "is-selected" : ""}`} transform={`translate(${p[0]} ${p[1]})`}>
                <circle r={3.5} />
                <text x={l.dx} y={l.dy} textAnchor={l.anchor}>
                  {c.name}
                </text>
              </g>
            );
          })}
        {!world && (
          <text x={SIZE / 2} y={SIZE / 2} className="globe-loading" textAnchor="middle">
            {pick(lang, "Lade Karte …", "Loading map …")}
          </text>
        )}
      </svg>
      {hoverCountry && (
        <div className="globe-tip" aria-hidden="true">
          <Flag code={hoverCountry.flag} /> {hoverCountry.name} ·{" "}
          {hoverCountry.leagues.map((l) => l.name).join(", ")}
        </div>
      )}
      <div className="globe-tools">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => {
            setZoomStep(START_ZOOM);
            if (selected) onSelect(null);
            else flyTo(EUROPE);
          }}
        >
          {pick(lang, "Europa", "Europe")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label={pick(lang, "Hineinzoomen", "Zoom in")}
          disabled={zoomStep === ZOOMS.length - 1}
          onClick={() => setZoomStep((z) => Math.min(ZOOMS.length - 1, z + 1))}
        >
          +
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label={pick(lang, "Herauszoomen", "Zoom out")}
          disabled={zoomStep === 0}
          onClick={() => setZoomStep((z) => Math.max(0, z - 1))}
        >
          −
        </button>
      </div>
    </div>
  );
}

function ClubGrid({ clubs, lang }: { clubs: ExplorerClub[]; lang: Lang }) {
  return (
    <div className="club-grid">
      {clubs.map((c, i) => (
        <Link key={c.slug} href={url(lang, "verein", c.slug)} className="club-tile">
          <span className="ct-rank">{i + 1}</span>
          <ClubBadge name={c.name} size={40} flag={c.flag} />
          <span className="ct-main">
            <span className="ct-name">{c.name}</span>
            {c.leader && (
              <span className="ct-leader">
                {c.leader.name} · {c.leader.pa}
              </span>
            )}
          </span>
          <span className="ct-num">
            <b>{c.pre}</b>
            <small>{t(lang, "common.ofGoals", { n: c.goals })}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}

function LeagueBlock({ league, open, lang }: { league: ExplorerLeague; open: boolean; lang: Lang }) {
  const clubs = league.seasons.reduce((n, s) => n + s.clubs.length, 0);
  return (
    <details className="league-acc" open={open || undefined}>
      <summary>
        <Flag code={league.flag} />
        <span className="acc-name">{league.name}</span>
        <span className="acc-meta">
          {league.seasons.length
            ? `${league.seasons.map((s) => s.label).join(", ")} · ${clubs} ${pick(lang, clubs === 1 ? "Team" : "Teams", clubs === 1 ? "team" : "teams")}`
            : t(lang, "common.dataSoon")}
        </span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className="acc-chevron">
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </summary>
      <div className="acc-body">
        {league.seasons.length === 0 && (
          <p className="muted">
            {pick(
              lang,
              "Für diese Liga gibt es noch keine Daten. ",
              "There is no data for this league yet. ",
            )}
            <Link href={url(lang, "liga", league.key)} className="text-link">
              {pick(lang, "Mehr zur Liga", "About the league")}
            </Link>
          </p>
        )}
        {league.seasons.map((s) => (
          <div key={s.slug} className="acc-season">
            {league.seasons.length > 1 && <h3 className="sub-title">{s.label}</h3>}
            <ClubGrid clubs={s.clubs} lang={lang} />
          </div>
        ))}
      </div>
    </details>
  );
}

export default function ClubsExplorer({
  countries,
  tournaments,
  lang,
}: {
  countries: ExplorerCountry[];
  tournaments: ExplorerLeague[];
  lang: Lang;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = countries.find((c) => c.iso === selected) ?? null;

  const select = (iso: string | null) => {
    setSelected(iso);
    // Am Handy liegt die Liste unter dem Globus – hinscrollen
    if (iso && window.innerWidth < 900) setTimeout(() => list.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="clubs-explorer">
      <div className="clubs-map">
        <Globe countries={countries} selected={selected} onSelect={select} lang={lang} />
        <div className="country-chips" role="group" aria-label={pick(lang, "Land wählen", "Choose a country")}>
          {countries.map((c) => (
            <button
              key={c.iso}
              type="button"
              className={`pill ${selected === c.iso ? "is-active" : ""} ${c.leagues.some((l) => l.seasons.length) ? "" : "is-planned"}`}
              onClick={() => select(selected === c.iso ? null : c.iso)}
            >
              <Flag code={c.flag} /> {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="clubs-list" ref={list}>
        {current ? (
          <>
            <div className="clubs-list-head">
              <h2 className="section-title">
                <Flag code={current.flag} /> {current.name}
              </h2>
              <button type="button" className="link-btn" onClick={() => select(null)}>
                {pick(lang, "Alle Länder", "All countries")}
              </button>
            </div>
            {current.leagues.map((l) => (
              <LeagueBlock key={l.key} league={l} open={current.leagues.length === 1 || l.seasons.length > 0} lang={lang} />
            ))}
          </>
        ) : (
          <>
            <h2 className="section-title">{pick(lang, "Ligen", "Leagues")}</h2>
            {countries.flatMap((c) => c.leagues).map((l) => (
              <LeagueBlock key={l.key} league={l} open={false} lang={lang} />
            ))}
          </>
        )}

        {tournaments.length > 0 && (
          <>
            <h2 className="section-title clubs-national">{t(lang, "common.nationalTeams")}</h2>
            {tournaments.map((l) => (
              <LeagueBlock key={l.key} league={l} open={false} lang={lang} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
