"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ChainReplay from "./ChainReplay";
import ShareButton from "./ShareButton";
import { describePass, formatClock } from "@/lib/cards";
import type { Goal } from "@/lib/data";
import { LOCALE, num, passLabel, t, url, type Lang } from "@/lib/i18n";

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

export default function DailyChain({ candidates, lang = "de" }: { candidates: DailyCandidate[]; lang?: Lang }) {
  // Vor dem Laden im Browser den ersten Kandidaten zeigen, danach den des Tages (vermeidet Abweichungen beim Rendern)
  const [index, setIndex] = useState(0);
  const [today, setToday] = useState("");
  useEffect(() => {
    setIndex(pickIndex(candidates.length));
    setToday(new Date().toLocaleDateString(LOCALE[lang], { weekday: "long", day: "numeric", month: "long" }));
  }, [candidates.length, lang]);
  const c = candidates[index];
  if (!c) return null;
  const { goal, names, slugs } = c;
  const who = (id: number) =>
    slugs[String(id)] ? <Link href={url(lang, "spieler", slugs[String(id)])}>{names[String(id)]}</Link> : names[String(id)];

  return (
    <div className="daily">
      <div className="daily-stage">
        <ChainReplay goal={goal} names={names} lang={lang} />
      </div>
      <div className="daily-info">
        <span className="daily-badge">
          {lang === "en" ? "Today" : "Heute"}
          {today && <span> · {today}</span>}
        </span>
        <h2>{c.match}</h2>
        <p className="muted">
          {c.season} · {formatClock(goal.period, goal.minute)}
        </p>
        <ol className="chain">
          {goal.pre && (
            <li className="chain-step pre">
              <span className="chain-label">{t(lang, "common.preAssist")}</span>
              {who(goal.pre.player)}
              <span className="chain-detail">{passLabel(lang, describePass(goal.pre))}</span>
            </li>
          )}
          {goal.assist && (
            <li className="chain-step assist">
              <span className="chain-label">{t(lang, "common.assist")}</span>
              {who(goal.assist.player)}
              <span className="chain-detail">{passLabel(lang, describePass(goal.assist))}</span>
            </li>
          )}
          <li className="chain-step shot">
            <span className="chain-label">{t(lang, "common.goal")}</span>
            {who(goal.scorer)}
            <span className="chain-detail">xG {num(lang, goal.xg, 2)}</span>
          </li>
        </ol>
        <div className="player-actions">
          <Link href={url(lang, "torketten")} className="btn btn-ghost btn-small">
            {t(lang, "home.allChains")}
          </Link>
          <ShareButton
            kind="goal"
            small
            lang={lang}
            filename={lang === "en" ? "move-of-the-day.png" : "spielzug-des-tages.png"}
            title={c.match}
            data={{ goal, names, matchLabel: c.match, context: c.context }}
          />
        </div>
      </div>
    </div>
  );
}
