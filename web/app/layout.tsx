import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PreAssist – Die Pässe vor dem Assist",
    template: "%s · PreAssist",
  },
  description:
    "Die Anlaufstelle für Pre-Assists im Fußball: Ranglisten, Spielerprofile und Passketten – wer den Pass vor dem Assist spielt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark">P</span>
              <span>
                Pre<strong>Assist</strong>
              </span>
            </Link>
            <nav>
              <Link href="/wettbewerb/premier-league-2015-16/">Premier League</Link>
              <Link href="/wettbewerb/la-liga-2015-16/">La Liga</Link>
              <Link href="/wettbewerb/bundesliga-2023-24/">Bundesliga</Link>
              <Link href="/methodik/">Methodik</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            Daten: <a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a> (Hudl StatsBomb).
            Pre-Assists eigene Berechnung – siehe <Link href="/methodik/">Methodik</Link>.
          </div>
        </footer>
      </body>
    </html>
  );
}
