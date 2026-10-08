import LogoMark from "./LogoMark";

// Ladeanzeige: das Logo baut sich als Passkette immer wieder auf.
export default function LogoLoader({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`logo-loader${compact ? " is-compact" : ""}`} role="status">
      <LogoMark loop />
      <span>{label}</span>
    </div>
  );
}
