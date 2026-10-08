import type { MetadataRoute } from "next";
import { getClubs, getPlayerSlugs, getSeasons } from "@/lib/data";
import { url, type RouteKey } from "@/lib/i18n";
import { LEAGUES } from "@/lib/leagues";

export const dynamic = "force-static";

const BASE = "https://www.preassists.at";

export default function sitemap(): MetadataRoute.Sitemap {
  // Jede Seite in beiden Sprachen, jeweils mit Verweis auf die andere Fassung
  const page = (key: RouteKey, priority: number, slug?: string) =>
    (["de", "en"] as const).map((lang) => ({
      url: `${BASE}${url(lang, key, slug)}`,
      priority: lang === "de" ? priority : Math.round(priority * 80) / 100,
      alternates: { languages: { de: `${BASE}${url("de", key, slug)}`, en: `${BASE}${url("en", key, slug)}` } },
    }));
  return [
    ...page("home", 1),
    ...page("ligen", 0.8),
    ...page("vereine", 0.7),
    ...page("torketten", 0.8),
    ...page("vergleich", 0.6),
    ...page("rekorde", 0.7),
    ...page("spiele", 0.7),
    ...page("passspiel", 0.7),
    ...page("spiel", 0.6),
    ...page("methodik", 0.5),
    ...LEAGUES.flatMap((l) => page("liga", 0.7, l.key)),
    ...getSeasons().flatMap((s) => page("wettbewerb", 0.8, s.meta.slug)),
    ...getClubs().flatMap((c) => page("verein", 0.6, c.slug)),
    ...getPlayerSlugs().flatMap((slug) => page("spieler", 0.5, slug)),
  ];
}
