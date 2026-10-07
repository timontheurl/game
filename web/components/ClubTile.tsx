import Link from "next/link";
import ClubBadge from "./ClubBadge";
import type { Club, PlayerRow } from "@/lib/data";
import { t, url, type Lang } from "@/lib/i18n";

/** Kachel eines Vereins mit Platz, bestem Vorbereiter und Pre-Assists. */
export default function ClubTile({
  club,
  rank,
  goals,
  preAssists,
  leader,
  lang,
}: {
  club: Club;
  rank: number;
  goals: number;
  preAssists: number;
  leader: PlayerRow | undefined;
  lang: Lang;
}) {
  return (
    <Link href={url(lang, "verein", club.slug)} className="club-tile">
      <span className="ct-rank">{rank}</span>
      <ClubBadge name={club.name} size={40} flag={club.flag} />
      <span className="ct-main">
        <span className="ct-name">{club.name}</span>
        {leader && (
          <span className="ct-leader">
            {leader.name} · {leader.preAssists}
          </span>
        )}
      </span>
      <span className="ct-num">
        <b>{preAssists}</b>
        <small>{t(lang, "common.ofGoals", { n: goals })}</small>
      </span>
    </Link>
  );
}
