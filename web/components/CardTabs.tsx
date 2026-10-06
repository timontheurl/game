"use client";

import Link from "next/link";
import { useState } from "react";
import PlayerCard from "./PlayerCard";
import type { CardData } from "@/lib/cards";

export interface CardTab {
  key: string;
  label: string;
  cards: CardData[];
  href?: string;
}

export default function CardTabs({ tabs }: { tabs: CardTab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="card-tabs">
      <div className="pills" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            className={`pill ${t.key === active ? "is-active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="card-grid" role="tabpanel">
        {tab.cards.map((c) => (
          <PlayerCard key={`${tab.key}-${c.slug}-${c.season}`} card={c} />
        ))}
      </div>
      {tab.href && (
        <Link href={tab.href} className="view-all">
          Ganze Rangliste ansehen
        </Link>
      )}
    </div>
  );
}
