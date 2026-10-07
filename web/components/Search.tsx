"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { langFromPath, t, url, type Lang } from "@/lib/i18n";
import type { SearchEntry } from "@/lib/indexes";

const indexPromise: Partial<Record<Lang, Promise<SearchEntry[]>>> = {};
function loadIndex(lang: Lang) {
  indexPromise[lang] ??= fetch(lang === "en" ? "/search-index-en.json" : "/search-index.json").then((r) => r.json());
  return indexPromise[lang];
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function Search({ variant = "nav" }: { variant?: "nav" | "hero" }) {
  const router = useRouter();
  const lang = langFromPath(usePathname());
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Beim Sprachwechsel den passenden Index neu laden
  useEffect(() => setIndex(null), [lang]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = normalize(query.trim());
  const results = q && index ? index.filter((e) => normalize(e.name).includes(q)).slice(0, 8) : [];

  const go = (entry: SearchEntry) => {
    setOpen(false);
    setQuery("");
    router.push(url(lang, "spieler", entry.slug));
  };

  return (
    <div className={`search search-${variant}`} ref={wrap}>
      <svg viewBox="0 0 24 24" className="search-icon" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        type="search"
        placeholder={t(lang, "search.placeholder")}
        value={query}
        onFocus={() => {
          setOpen(true);
          loadIndex(lang).then(setIndex);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && results[active]) go(results[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
        aria-label={t(lang, "search.label")}
      />
      {open && q && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="search-empty">{t(lang, index ? "search.none" : "search.loading")}</li>}
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? "is-active" : ""}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
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
    </div>
  );
}
