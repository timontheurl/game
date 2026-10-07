"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALE, type Lang } from "@/lib/i18n";

/**
 * Zahl, die beim ersten Sichtbarwerden hochzählt.
 * Der Server liefert sofort den Endwert (für Suchmaschinen und ohne JavaScript).
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 900,
  lang = "de",
}: {
  value: number;
  decimals?: number;
  duration?: number;
  lang?: Lang;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(value * eased);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const text = shown.toLocaleString(LOCALE[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className="countup">
      {text}
    </span>
  );
}
