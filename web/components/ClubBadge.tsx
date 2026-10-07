import { clubShort } from "@/lib/cards";

/**
 * Neutrales Vereinswappen mit Kürzel – echte Logos sind markenrechtlich geschützt.
 * Nationalteams bekommen stattdessen ihre Flagge.
 */
export default function ClubBadge({ name, size = 48, flag }: { name: string; size?: number; flag?: string | null }) {
  if (flag) {
    return (
      <span
        className={`nation-badge fi fi-${flag}`}
        style={{ width: size, height: size * 0.75 }}
        aria-hidden="true"
      />
    );
  }
  return (
    <svg viewBox="0 0 48 56" width={size} height={(size * 56) / 48} className="club-badge" aria-hidden="true">
      <path d="M24 2 L45 9 V30 C45 42 36 50 24 54 C12 50 3 42 3 30 V9 Z" className="cb-shield" />
      <path d="M24 7 L40 12.5 V30 C40 39.5 33 46 24 49.5 C15 46 8 39.5 8 30 V12.5 Z" className="cb-inner" />
      <text x="24" y="33" textAnchor="middle" className="cb-text">
        {clubShort(name)}
      </text>
    </svg>
  );
}
