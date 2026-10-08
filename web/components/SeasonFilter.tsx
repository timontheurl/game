"use client";

import { Children, useEffect, useState } from "react";
import { pick, type Lang } from "@/lib/i18n";

export interface SeasonOption {
  slug: string; // Saison-Slug, auch Sprungmarke #s-<slug>
  competition: string;
  season: string;
}

/**
 * Zeigt von mehreren Saison-Blöcken genau einen; gewählt wird über Bewerb und Saison.
 * Alle Blöcke stehen im HTML (für Suchmaschinen), die übrigen sind nur ausgeblendet.
 */
export default function SeasonFilter({
  options,
  initial,
  lang,
  children,
}: {
  options: SeasonOption[];
  initial: string;
  lang: Lang;
  children: React.ReactNode;
}) {
  const [slug, setSlug] = useState(initial);
  const blocks = Children.toArray(children);
  const current = options.find((o) => o.slug === slug) ?? options[0];
  const competitions = [...new Set(options.map((o) => o.competition))];
  const seasons = options.filter((o) => o.competition === current.competition);

  // Sprung aus der Karriere-Tabelle (#s-<slug>) oder direkter Link
  useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#s-/, ""));
      if (options.some((o) => o.slug === h)) setSlug(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [options]);

  const choose = (next: string) => {
    setSlug(next);
    window.history.replaceState(null, "", `#s-${next}`);
  };

  return (
    <div className="season-filter" id="saisons">
      {options.length > 1 && (
        <div className="filters season-filter-bar">
          <label>
            <span>{pick(lang, "Bewerb", "Competition")}</span>
            <select
              value={current.competition}
              onChange={(e) => {
                // neueste Saison des gewählten Bewerbs
                const first = options.find((o) => o.competition === e.target.value);
                if (first) choose(first.slug);
              }}
            >
              {competitions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{pick(lang, "Saison", "Season")}</span>
            <select value={current.slug} onChange={(e) => choose(e.target.value)} disabled={seasons.length < 2}>
              {seasons.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.season}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {blocks.map((b, i) => (
        <div key={options[i]?.slug ?? i} hidden={options[i]?.slug !== current.slug}>
          {b}
        </div>
      ))}
    </div>
  );
}
