"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Diese Elemente bekommen automatisch eine Einblend-Animation beim Scrollen.
const AUTO_REVEAL = [
  ".section-title",
  ".league-row",
  ".league-box .pcard",
  ".card-grid > *",
  ".goal-card",
  ".league-tile",
  ".stat-table > div",
  ".combo-list li",
  ".banner",
  ".pa-map",
  ".club-tile",
  ".club-facts > div",
  ".reveal",
].join(",");

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Globale Bewegungs-Effekte ohne zusätzliche Bibliothek:
 * – Einblenden beim Scrollen (gestaffelt innerhalb einer Gruppe)
 * – 3D-Neigung und Glanz der Spielerkarten unter dem Mauszeiger
 */
export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const els = Array.from(document.querySelectorAll<HTMLElement>(AUTO_REVEAL));
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    // Staffelung: Geschwister in derselben Gruppe kommen nacheinander
    const groups = new Map<Element | null, number>();
    els.forEach((el) => {
      el.classList.add("reveal");
      const n = groups.get(el.parentElement) ?? 0;
      groups.set(el.parentElement, n + 1);
      el.style.setProperty("--reveal-delay", `${Math.min(n, 8) * 60}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    let active: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(".pcard");
      if (active && active !== card) reset(active);
      active = card ?? null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", `${(x - 0.5) * 16}deg`);
      card.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.classList.add("is-tilting");
    };
    const reset = (card: HTMLElement) => {
      card.classList.remove("is-tilting");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    };
    const onLeave = () => active && reset(active);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
