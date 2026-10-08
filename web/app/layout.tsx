import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Motion from "@/components/Motion";
import PitchBackdrop from "@/components/PitchBackdrop";
import Search from "@/components/Search";
import SiteNav from "@/components/SiteNav";
import { Brand, SiteFooter, SkipLink } from "@/components/SiteChrome";
import { getLeagueStatuses } from "@/lib/data";
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
  openGraph: {
    type: "website",
    locale: "de_AT",
    siteName: "PreAssists",
  },
  twitter: { card: "summary_large_image" },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PreAssists",
  url: "https://www.preassists.at",
  inLanguage: "de",
  description: "Die Anlaufstelle für Pre-Assists im Fußball: der Pass, der zum Assist führt.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Für das Menü „Bewerbe“: Ligen und Turniere, für die es schon Daten gibt
  const live = getLeagueStatuses()
    .filter((s) => s.seasons.length > 0)
    .map((s) => s.league.key);
  return (
    <html lang="de" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <SkipLink />
        <PitchBackdrop />
        <Motion />
        <header className="topbar">
          <div className="topbar-inner">
            <Brand />
            <Search />
            <SiteNav live={live} />
          </div>
        </header>
        <main id="inhalt" className="page">{children}</main>
        <SiteFooter />
        {/* Besucherstatistik ohne Cookies; zählt nur, wenn sie im Vercel-Projekt aktiviert ist */}
        <Analytics />
      </body>
    </html>
  );
}
