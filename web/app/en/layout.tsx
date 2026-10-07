import type { Metadata } from "next";

// Englische Fassung unter /en/… – der Inhalt wird für Screenreader und Suchmaschinen als Englisch markiert.
export const metadata: Metadata = {
  title: { default: "PreAssists – Who plays the pass before the assist?", template: "%s · PreAssists" },
  description:
    "Rankings, player profiles and goal chains for the pre-assist: the pass that leads to the assist. Premier League, La Liga, Bundesliga, World Cup and more.",
  openGraph: { type: "website", locale: "en_GB", siteName: "PreAssists" },
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>;
}
