import Link from "next/link";
import type { CardData } from "@/lib/cards";

export function Flag({ code, title }: { code: string | null; title?: string | null }) {
  if (!code) return null;
  return <span className={`fi fi-${code} flag`} title={title ?? undefined} aria-label={title ?? undefined} />;
}

/** Piktogramm eines Fußballers beim Schuss. */
export function FootballerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M33 20 L29 35" />
        <path d="M32 22 L22 26 L18 21" />
        <path d="M32 22 L42 28" />
        <path d="M29 35 L25 47 L27 58" />
        <path d="M29 35 L39 42 L48 39" />
      </g>
      <circle cx="35" cy="10" r="5.5" fill="currentColor" />
      <circle cx="55" cy="46" r="4.5" fill="currentColor" />
    </svg>
  );
}

const de = (n: number, digits: number) => n.toFixed(digits).replace(".", ",");

export default function PlayerCard({ card, size = "md" }: { card: CardData; size?: "md" | "lg" }) {
  const stats: [string, string][] = [
    ["PA", String(card.preAssists)],
    ["AST", String(card.assists)],
    ["TOR", String(card.goals)],
    ["BET", String(card.involvements)],
    ["xG", de(card.preAssistXg, 1)],
    ["SP", String(card.matches)],
  ];

  return (
    <Link href={`/spieler/${card.slug}/`} className={`pcard pcard-${size}`}>
      <span className="pcard-watermark" aria-hidden="true">
        P
      </span>
      <span className="pcard-top">
        <span className="pcard-rating">{card.preAssists}</span>
        <span className="pcard-pos">{card.position ?? "–"}</span>
      </span>
      <FootballerIcon className="pcard-figure" />
      <span className="pcard-name">{card.name}</span>
      <span className="pcard-stats">
        {stats.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))}
      </span>
      <span className="pcard-foot">
        <Flag code={card.country} title={card.countryName} />
        <span className="pcard-club">{card.team}</span>
      </span>
    </Link>
  );
}
