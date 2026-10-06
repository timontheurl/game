import Link from "next/link";
import { cardTier, initials, type CardData } from "@/lib/cards";

export function Flag({ code, title }: { code: string | null; title?: string | null }) {
  if (!code) return null;
  return <span className={`fi fi-${code} flag`} title={title ?? undefined} aria-label={title ?? undefined} />;
}

export default function PlayerCard({ card, size = "md" }: { card: CardData; size?: "md" | "lg" }) {
  const tier = cardTier(card.preAssists);
  const stats: [string, string | number][] = [
    ["PA", card.preAssists],
    ["AST", card.assists],
    ["TOR", card.goals],
    ["BET", card.involvements],
    ["xG", card.preAssistXg.toFixed(1)],
    ["MIN", card.minutes >= 1000 ? `${(card.minutes / 1000).toFixed(1)}k` : card.minutes],
  ];

  return (
    <Link href={`/spieler/${card.slug}/`} className={`pcard pcard-${tier} pcard-${size}`}>
      <span className="pcard-top">
        <span className="pcard-rating">{card.preAssists}</span>
        <span className="pcard-pos">{card.position ?? "–"}</span>
        <Flag code={card.country} title={card.countryName} />
      </span>
      <span className="pcard-face" aria-hidden="true">
        {initials(card.name)}
      </span>
      <span className="pcard-name">{card.name}</span>
      <span className="pcard-stats">
        {stats.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))}
      </span>
      <span className="pcard-club">{card.team}</span>
    </Link>
  );
}
