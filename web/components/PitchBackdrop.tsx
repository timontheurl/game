/** Spielfeld als dezenter Seitenhintergrund (Maße 105 × 68 m, 1 Einheit = 10 cm). */
export default function PitchBackdrop() {
  return (
    <div className="pitch-backdrop" aria-hidden="true">
      <svg viewBox="-60 -60 1170 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none">
          <rect x="0" y="0" width="1050" height="680" />
          <line x1="525" y1="0" x2="525" y2="680" />
          <circle cx="525" cy="340" r="91.5" />

          <rect x="0" y="138.5" width="165" height="403" />
          <rect x="0" y="248.5" width="55" height="183" />
          <rect x="-24" y="303.4" width="24" height="73.2" />
          <path d="M165 266.9 A91.5 91.5 0 0 1 165 413.1" />

          <rect x="885" y="138.5" width="165" height="403" />
          <rect x="995" y="248.5" width="55" height="183" />
          <rect x="1050" y="303.4" width="24" height="73.2" />
          <path d="M885 266.9 A91.5 91.5 0 0 0 885 413.1" />

          <path d="M0 10 A10 10 0 0 0 10 0" />
          <path d="M1040 0 A10 10 0 0 0 1050 10" />
          <path d="M1050 670 A10 10 0 0 0 1040 680" />
          <path d="M10 680 A10 10 0 0 0 0 670" />
        </g>
        <g className="spots">
          <circle cx="525" cy="340" r="4" />
          <circle cx="110" cy="340" r="4" />
          <circle cx="940" cy="340" r="4" />
        </g>
      </svg>
    </div>
  );
}
