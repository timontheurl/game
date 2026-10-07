"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ChainReplay from "./ChainReplay";
import ShareButton from "./ShareButton";
import { describePass, formatClock } from "@/lib/cards";
import type { Goal } from "@/lib/data";

export interface DailyCandidate {
  goal: Goal;
  names: Record<string, string>;
  slugs: Record<string, string>;
  match: string;
  context: string;
  season: string;
}

/** Wählt je Kalendertag einen anderen Spielzug – für alle Besucher am selben Tag derselbe. */
function pickIndex(n: number, date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return ((day * 2654435761) >>> 0) % n;
}

export default function DailyChain({ candidates }: { candidates: DailyCandidate[] }) {
  // Vor dem Laden im Browser den ersten Kandidaten zeigen, danach den des Tages (vermeidet Abweichungen beim Rendern)
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(pickIndex(candidates.length)), [candidates.length]);
  const c = candidates[index];
  if (!c) return null;
  const { goal, names, slugs } = c;
  const who = (id: number) =>
    slugs[String(id)] ? <Link href={`/spieler/${slugs[String(id)]}/`}>{names[String(id)]}</Link> : names[String(id)];

  return (
    <div className="daily">
      <div className="daily-stage">
        <ChainReplay goal={goal} names={names} />
      </div>
      <div className="daily-info">
        <span className="league-kicker">Spielzug des Tages</span>
        <h2>{c.match}</h2>
        <p className="muted">
          {c.season} · {formatClock(goal.period, goal.minute)}
        </p>
        <ol className="chain">
          {goal.pre && (
            <li className="chain-step pre">
              <span className="chain-label">Pre-Assist</span>
              {who(goal.pre.player)}
              <span className="chain-detail">{describePass(goal.pre)}</span>
            </li>
          )}
          {goal.assist && (
            <li className="chain-step assist">
              <span className="chain-label">Assist</span>
              {who(goal.assist.player)}
              <span className="chain-detail">{describePass(goal.assist)}</span>
            </li>
          )}
          <li className="chain-step shot">
            <span className="chain-label">Tor</span>
            {who(goal.scorer)}
            <span className="chain-detail">xG {goal.xg.toFixed(2).replace(".", ",")}</span>
          </li>
        </ol>
        <div className="player-actions">
          <Link href="/torketten/" className="btn btn-ghost btn-small">
            Alle Torketten
          </Link>
          <ShareButton
            kind="goal"
            small
            filename="spielzug-des-tages.png"
            title={c.match}
            data={{ goal, names, matchLabel: c.match, context: c.context }}
          />
        </div>
      </div>
    </div>
  );
}
