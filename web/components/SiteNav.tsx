"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const NAV = [
  { href: "/ligen/", label: "Ligen" },
  { href: "/vereine/", label: "Vereine" },
  { href: "/torketten/", label: "Torketten" },
  { href: "/vergleich/", label: "Vergleich" },
  { href: "/methodik/", label: "So zählen wir" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Menü schließen, sobald eine neue Seite geladen ist
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <>
      <button
        type="button"
        className={`burger ${open ? "is-open" : ""}`}
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        aria-controls="mainnav"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav id="mainnav" className={`mainnav ${open ? "is-open" : ""}`}>
        {NAV.map((n, i) => (
          <Link
            key={n.href}
            href={n.href}
            className={isActive(n.href) ? "is-active" : ""}
            style={{ "--i": i } as React.CSSProperties}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
