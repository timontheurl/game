"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { langFromPath, t, url } from "@/lib/i18n";

// Kopf- und Fußzeile in der Sprache der aktuellen Seite.

export function Brand() {
  const lang = langFromPath(usePathname());
  return (
    <Link href={url(lang, "home")} className="brand" aria-label={t(lang, "nav.home")}>
      <span className="brand-mark">PA</span>
    </Link>
  );
}

export function SkipLink() {
  const lang = langFromPath(usePathname());
  return (
    <a href="#inhalt" className="skip-link">
      {t(lang, "nav.skip")}
    </a>
  );
}

export function SiteFooter() {
  const lang = langFromPath(usePathname());
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="wordmark small">
          Pre<span>Assists</span>
        </span>
        <span className="footer-note">
          {t(lang, "footer.data")} <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a>.{" "}
          {t(lang, "footer.own")}
        </span>
        <nav>
          <Link href={url(lang, "ligen")}>{t(lang, "nav.leagues")}</Link>
          <Link href={url(lang, "methodik")}>{t(lang, "nav.method")}</Link>
          <Link href="/impressum/" hrefLang="de">
            {t(lang, "footer.imprint")}
          </Link>
          <Link href="/datenschutz/" hrefLang="de">
            {t(lang, "footer.privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
