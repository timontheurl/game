import Link from "next/link";
import { clubShort, type CardData } from "@/lib/cards";

export function Flag({ code, title }: { code: string | null; title?: string | null }) {
  if (!code) return null;
  return <span className={`fi fi-${code} flag`} title={title ?? undefined} aria-label={title ?? undefined} />;
}

/** Neutrale Spieler-Silhouette (Kopf und Schultern) – wir haben keine Rechte an Spielerfotos. */
function Silhouette() {
  return (
    <svg viewBox="0 0 100 100" className="pcard-bust" aria-hidden="true">
      <defs>
        <linearGradient id="bust-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6a55" />
          <stop offset="0.75" stopColor="#4a362a" />
          <stop offset="1" stopColor="#4a362a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill="url(#bust-fill)"
        d="M50 8c11.5 0 19 9 19 22 0 9-3.6 17-9 21.5V58c11 2 24 6.5 30 14 4 5 6 15 6 28H4c0-13 2-23 6-28 6-7.5 19-12 30-14v-6.5C34.6 47 31 39 31 30 31 17 38.5 8 50 8Z"
      />
    </svg>
  );
}

const de = (n: number, digits: number) => n.toFixed(digits).replace(".", ",");

export default function PlayerCard({ card, size = "md" }: { card: CardData; size?: "md" | "lg" }) {
  const left: [string, string][] = [
    [String(card.preAssists), "PA"],
    [String(card.assists), "AST"],
    [String(card.goals), "TOR"],
  ];
  const right: [string, string][] = [
    [de(card.xpa, 1), "xPA"],
    [String(card.involvements), "BET"],
    [String(card.matches), "SP"],
  ];

  return (
    <Link href={`/spieler/${card.slug}/`} className={`pcard pcard-${size}`}>
      <span className="pcard-upper">
        <span className="pcard-watermark" aria-hidden="true">
          P
        </span>
        <Silhouette />
        <span className="pcard-side">
          <span className="pcard-rating">{card.preAssists}</span>
          <span className="pcard-pos">{card.position ?? "–"}</span>
          {card.country && (
            <span className="pcard-badge">
              <Flag code={card.country} title={card.countryName} />
            </span>
          )}
          <span className="pcard-club" title={card.team}>
            {clubShort(card.team)}
          </span>
        </span>
      </span>
      <span className="pcard-lower">
        <span className="pcard-name">{card.name}</span>
        <span className="pcard-rule" />
        <span className="pcard-stats">
          <span className="pcard-col">
            {left.map(([v, l]) => (
              <span key={l}>
                <b>{v}</b> <small>{l}</small>
              </span>
            ))}
          </span>
          <span className="pcard-divider" />
          <span className="pcard-col">
            {right.map(([v, l]) => (
              <span key={l}>
                <b>{v}</b> <small>{l}</small>
              </span>
            ))}
          </span>
        </span>
        <span className="pcard-rule short" />
      </span>
    </Link>
  );
}
