import Link from "next/link";
import { clubShort, type CardData } from "@/lib/cards";
import { num, t, url, type Lang } from "@/lib/i18n";

export function Flag({ code, title }: { code: string | null; title?: string | null }) {
  if (!code) return null;
  return <span className={`fi fi-${code} flag`} title={title ?? undefined} aria-label={title ?? undefined} />;
}

/**
 * Vorderseite der Spielerkarte: Grafik als Hintergrund (public/cards/karte.webp),
 * links Wert, Position, Flagge und Verein, unten Name und zwei Spalten Werte.
 */
export function CardFace({
  rating,
  ratingClass = "",
  position,
  country,
  countryName,
  team,
  name,
  stats,
  bottom,
}: {
  rating: React.ReactNode;
  ratingClass?: string;
  position: string | null;
  country: string | null;
  countryName: string | null;
  team: string;
  name: string;
  /** Zwei Spalten mit je drei Werten [Wert, Kürzel] */
  stats?: [[string, string][], [string, string][]];
  /** Statt der Werte, z. B. im Spiel, wo sie noch geheim sind */
  bottom?: React.ReactNode;
}) {
  return (
    <>
      <span className="pc-left">
        <b className={`pc-rating ${ratingClass}`}>{rating}</b>
        <span className="pc-pos">{position ?? "–"}</span>
        <span className="pc-rule" />
        {country ? <Flag code={country} title={countryName} /> : <span className="flag" />}
        <span className="pc-rule" />
        <span className="pc-club" title={team}>
          {clubShort(team)}
        </span>
      </span>
      <span className={`pc-name ${name.length > 16 ? "is-long" : ""}`}>{name}</span>
      {stats ? (
        <span className="pc-stats">
          {stats.map((col, i) => (
            <span key={i} className="pc-col">
              {col.map(([v, l]) => (
                <span key={l}>
                  <small>{l}</small>
                  <b>{v}</b>
                </span>
              ))}
            </span>
          ))}
        </span>
      ) : (
        <span className="pc-bottom">{bottom}</span>
      )}
    </>
  );
}

export default function PlayerCard({
  card,
  size = "md",
  lang = "de",
}: {
  card: CardData;
  size?: "md" | "lg";
  lang?: Lang;
}) {
  return (
    <Link href={url(lang, "spieler", card.slug)} className={`pcard pcard-${size}`} aria-label={card.name}>
      <CardFace
        rating={card.preAssists}
        position={card.position}
        country={card.country}
        countryName={card.countryName}
        team={card.team}
        name={card.name}
        stats={[
          [
            [String(card.preAssists), t(lang, "card.pa")],
            [String(card.assists), t(lang, "card.ast")],
            [String(card.goals), t(lang, "card.goal")],
          ],
          [
            [num(lang, card.xpa, 1), t(lang, "card.xpa")],
            [String(card.involvements), t(lang, "card.inv")],
            [String(card.matches), t(lang, "card.apps")],
          ],
        ]}
      />
    </Link>
  );
}
