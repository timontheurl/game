import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import Motion from "@/components/Motion";
import PitchBackdrop from "@/components/PitchBackdrop";
import Search from "@/components/Search";
import SiteNav from "@/components/SiteNav";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

// next/font lädt die Schriften beim Build herunter und liefert sie selbst aus –
// Besucher verbinden sich nicht mit Google.
const barlow = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.preassists.at"),
  title: {
    default: "PreAssists – Wer spielt den Pass vor dem Assist?",
    template: "%s · PreAssists",
  },
  description:
    "Ranglisten, Spielerprofile und Passketten zum Pre-Assist: dem Pass, der zum Assist führt. Premier League, La Liga und Bundesliga.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <PitchBackdrop />
        <Motion />
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand" aria-label="PreAssists Startseite">
              <span className="brand-mark">PA</span>
            </Link>
            <Search />
            <SiteNav />
          </div>
        </header>
        <main className="page">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <span className="wordmark small">
              Pre<span>Assists</span>
            </span>
            <span className="footer-note">
              Daten: <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a>. Pre-Assists eigene
              Berechnung.
            </span>
            <nav>
              <Link href="/ligen/">Ligen</Link>
              <Link href="/methodik/">So zählen wir</Link>
              <Link href="/impressum/">Impressum</Link>
              <Link href="/datenschutz/">Datenschutz</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
