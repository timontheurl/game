"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flag } from "./PlayerCard";
import { langFromPath, pick, switchPath, t, url, type Lang, type RouteKey, type TKey } from "@/lib/i18n";
import { LEAGUES, leagueText } from "@/lib/leagues";

const NAV: { key: RouteKey; label: TKey }[] = [
  { key: "vereine", label: "nav.clubs" },
  { key: "torketten", label: "nav.chains" },
  { key: "vergleich", label: "nav.compare" },
  { key: "rekorde", label: "nav.records" },
  { key: "spiele", label: "nav.game" },
  { key: "methodik", label: "nav.method" },
];

/** Aufklappbarer Menüpunkt „Bewerbe“: links die Ligen, rechts die Turniere. */
function CompetitionsMenu({ lang, live, active }: { lang: Lang; live: string[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const leagues = LEAGUES.filter((l) => l.tier !== "turnier").sort(
    (a, b) => Number(live.includes(b.key)) - Number(live.includes(a.key)),
  );
  const tournaments = LEAGUES.filter((l) => l.tier === "turnier" && live.includes(l.key));
  const item = (key: string) => {
    const league = LEAGUES.find((l) => l.key === key)!;
    const text = leagueText(league, lang);
    const soon = !live.includes(key);
    return (
      <li key={key}>
        <Link href={url(lang, "liga", key)} className={soon ? "is-planned" : ""}>
          <Flag code={league.flag} />
          {text.name}
          {soon && <small>{pick(lang, "bald", "soon")}</small>}
        </Link>
      </li>
    );
  };

  return (
    <div
      className={`navdrop ${open ? "is-open" : ""}`}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        className={`navdrop-toggle ${active ? "is-active" : ""}`}
        aria-expanded={open}
        aria-controls="navdrop-panel"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => window.matchMedia("(hover: hover) and (min-width: 1001px)").matches && setOpen(true)}
      >
        {t(lang, "nav.leagues")}
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>
      <div id="navdrop-panel" className="navdrop-panel">
        <div className="navdrop-col">
          <span className="navdrop-title">{pick(lang, "Ligen", "Leagues")}</span>
          <ul>{leagues.map((l) => item(l.key))}</ul>
        </div>
        <div className="navdrop-col">
          <span className="navdrop-title">{t(lang, "home.tournaments")}</span>
          <ul>{tournaments.map((l) => item(l.key))}</ul>
          <Link href={url(lang, "ligen")} className="navdrop-all">
            {pick(lang, "Alle Bewerbe", "All competitions")} ›
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SiteNav({ live = [] }: { live?: string[] }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const lang = langFromPath(pathname);
  const other: Lang = lang === "de" ? "en" : "de";
  const [open, setOpen] = useState(false);

  // Menü schließen, sobald eine neue Seite geladen ist; Sprache des Dokuments nachziehen
  useEffect(() => {
    setOpen(false);
    document.documentElement.lang = lang;
  }, [pathname, lang]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href);
  // Wettbewerbe gehören zu "Ligen", einzelne Vereine zu "Vereine"
  const section = (key: RouteKey) =>
    isActive(url(lang, key)) ||
    (key === "ligen" && (isActive(url(lang, "liga")) || isActive(url(lang, "wettbewerb")))) ||
    (key === "vereine" && isActive(url(lang, "verein"))) ||
    (key === "spiele" && isActive(url(lang, "spiel")));

  return (
    <>
      <button
        type="button"
        className={`burger ${open ? "is-open" : ""}`}
        aria-label={t(lang, open ? "nav.menuClose" : "nav.menuOpen")}
        aria-expanded={open}
        aria-controls="mainnav"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav id="mainnav" className={`mainnav ${open ? "is-open" : ""}`}>
        <CompetitionsMenu lang={lang} live={live} active={section("ligen")} />
        {NAV.map((n, i) => (
          <Link
            key={n.key}
            href={url(lang, n.key)}
            className={section(n.key) ? "is-active" : ""}
            style={{ "--i": i + 1 } as React.CSSProperties}
          >
            {t(lang, n.label)}
          </Link>
        ))}
        <Link
          href={switchPath(pathname, other)}
          hrefLang={other}
          lang={other}
          className="lang-switch"
          style={{ "--i": NAV.length + 1 } as React.CSSProperties}
          onClick={(e) => {
            // Abfrage mitnehmen (z. B. ?modus=raten), sie wird erst beim Klick gelesen
            const query = window.location.search;
            if (!query || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            router.push(switchPath(pathname, other) + query);
          }}
        >
          {other.toUpperCase()}
          <span className="sr-only"> – {t(lang, "lang.switch")}</span>
        </Link>
      </nav>
    </>
  );
}
