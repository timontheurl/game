import Link from "next/link";
import Pitch from "./Pitch";
import ShareButton from "./ShareButton";
import { describePass, formatClock, playerSlug, seasonLabel, type Goal, type Season } from "@/lib/data";

function PlayerName({ season, id }: { season: Season; id: number }) {
  const name = season.names[String(id)] ?? "Unbekannt";
  const slug = playerSlug(season, id);
  return slug ? <Link href={`/spieler/${slug}/`}>{name}</Link> : <span>{name}</span>;
}

export default function GoalCard({ season, goal, highlight }: { season: Season; goal: Goal; highlight?: number }) {
  const match = season.matches[String(goal.match)];
  const home = season.teams[String(match.home)];
  const away = season.teams[String(match.away)];
  const date = new Date(match.date).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });

  const step = (cls: string, label: string, id: number, detail?: string) => (
    <li className={`chain-step ${cls} ${highlight === id ? "is-highlight" : ""}`}>
      <span className="chain-label">{label}</span>
      <PlayerName season={season} id={id} />
      {detail && <span className="chain-detail">{detail}</span>}
    </li>
  );

  return (
    <article className="goal-card">
      <header>
        <span className="goal-match">
          {home} {match.home_score}:{match.away_score} {away}
        </span>
        <span className="goal-meta">
          {date} · {formatClock(goal.period, goal.minute)} · {season.teams[String(goal.team)]}
        </span>
      </header>
      <Pitch goal={goal} />
      <ol className="chain">
        {goal.pre && step("pre", "Pre-Assist", goal.pre.player, describePass(goal.pre))}
        {goal.assist && step("assist", "Assist", goal.assist.player, describePass(goal.assist))}
        {step("shot", "Tor", goal.scorer, `xG ${goal.xg.toFixed(2)}`)}
      </ol>
      <ShareButton
        kind="goal"
        small
        filename={`preassist-${goal.id.slice(0, 8)}.png`}
        title={`${home} ${match.home_score}:${match.away_score} ${away}`}
        data={{
          goal,
          // nur die drei beteiligten Namen mitgeben, nicht die ganze Saison
          names: Object.fromEntries(
            [goal.pre?.player, goal.assist?.player, goal.scorer]
              .filter((id): id is number => id !== undefined)
              .map((id) => [String(id), season.names[String(id)] ?? "Unbekannt"]),
          ),
          matchLabel: `${home} ${match.home_score}:${match.away_score} ${away}`,
          context: `${seasonLabel(season.meta)} · ${formatClock(goal.period, goal.minute)}`,
        }}
      />
    </article>
  );
}
