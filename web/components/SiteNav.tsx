"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { langFromPath, switchPath, t, url, type Lang, type RouteKey, type TKey } from "@/lib/i18n";

const NAV: { key: RouteKey; label: TKey }[] = [
  { key: "ligen", label: "nav.leagues" },
  { key: "vereine", label: "nav.clubs" },
  { key: "torketten", label: "nav.chains" },
  { key: "vergleich", label: "nav.compare" },
  { key: "rekorde", label: "nav.records" },
  { key: "methodik", label: "nav.method" },
];

export default function SiteNav() {
  const pathname = usePathname() ?? "/";
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
    (key === "vereine" && isActive(url(lang, "verein")));

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
        {NAV.map((n, i) => (
          <Link
            key={n.key}
            href={url(lang, n.key)}
            className={section(n.key) ? "is-active" : ""}
            style={{ "--i": i } as React.CSSProperties}
          >
            {t(lang, n.label)}
          </Link>
        ))}
        <Link
          href={switchPath(pathname, other)}
          hrefLang={other}
          lang={other}
          className="lang-switch"
          style={{ "--i": NAV.length } as React.CSSProperties}
        >
          {other.toUpperCase()}
          <span className="sr-only"> – {t(lang, "lang.switch")}</span>
        </Link>
      </nav>
    </>
  );
}
