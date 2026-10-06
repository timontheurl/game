import type { MetadataRoute } from "next";
import { getClubs, getPlayerSlugs, getSeasons } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";

export const dynamic = "force-static";

const BASE = "https://www.preassists.at";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({ url: `${BASE}${path}`, priority });
  return [
    page("/", 1),
    page("/ligen/", 0.8),
    page("/vereine/", 0.7),
    page("/torketten/", 0.8),
    page("/vergleich/", 0.6),
    page("/rekorde/", 0.7),
    page("/methodik/", 0.5),
    ...LEAGUES.map((l) => page(`/liga/${l.key}/`, 0.7)),
    ...getSeasons().map((s) => page(`/wettbewerb/${s.meta.slug}/`, 0.8)),
    ...getClubs().map((c) => page(`/verein/${c.slug}/`, 0.6)),
    ...getPlayerSlugs().map((slug) => page(`/spieler/${slug}/`, 0.5)),
  ];
}
