import { getPlayer } from "./data";

/** Saison mit den meisten Pre-Assists – sie steht im Vorschaubild. */
export function bestSeason(slug: string) {
  return [...getPlayer(slug)].sort((a, b) => b.row.preAssists - a.row.preAssists)[0];
}

/** Vorschaubilder gibt es nur für Spieler mit mindestens einem Pre-Assist (hält den Export klein). */
export function hasPlayerImage(slug: string) {
  return (bestSeason(slug)?.row.preAssists ?? 0) > 0;
}
