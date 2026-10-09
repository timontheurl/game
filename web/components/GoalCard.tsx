import Link from "next/link";
import Pitch from "./Pitch";
import ShareButton from "./ShareButton";
import { describePass, formatClock, playerSlug, seasonLabel, type Goal, type Season } from "@/lib/data";
import { LOCALE, num, passLabel, t, url, type Lang } from "@/lib/i18n";
import { isOneTwo } from "@/lib/oneTwo";

function PlayerName({ season, id, lang }: { season: Season; id: number; lang: Lang }) {
  const name = season.names[String(id)] ?? t(lang, "common.unknown");
  const slug = playerSlug(season, id);
  return slug ? <Link href={url(lang, "spieler", slug)}>{name}</Link> : <span>{name}</span>;
}

export default function GoalCard({
  season,
  goal,
  highlight,
  lang = "de",
}: {
  season: Season;
  goal: Goal;
  highlight?: number;
  lang?: Lang;
}) {
  const match = season.matches[String(goal.match)];
  const home = season.teams[String(match.home)];
  const away = season.teams[String(match.away)];
  const date = new Date(match.date).toLocaleDateString(LOCALE[lang], { day: "2-digit", month: "2-digit", year: "numeric" });

  const step = (cls: string, label: string, id: number, detail?: string) => (
    <li className={`chain-step ${cls} ${highlight === id ? "is-highlight" : ""}`}>
      <span className="chain-label">{label}</span>
      <PlayerName season={season} id={id} lang={lang} />
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
        {isOneTwo(goal) && (
          <span className="tag-onetwo" title={t(lang, "common.oneTwoNote", { name: season.names[String(goal.scorer)] ?? "" })}>
            {t(lang, "common.oneTwo")}
          </span>
        )}
      </header>
      <Pitch goal={goal} lang={lang} />
      <ol className="chain">
        {goal.pre && step("pre", t(lang, "common.preAssist"), goal.pre.player, passLabel(lang, describePass(goal.pre)))}
        {goal.assist &&
          step("assist", t(lang, "common.assist"), goal.assist.player, passLabel(lang, describePass(goal.assist)))}
        {step("shot", t(lang, "common.goal"), goal.scorer, `xG ${num(lang, goal.xg, 2)}`)}
      </ol>
      <ShareButton
        kind="goal"
        small
        lang={lang}
        filename={`preassist-${goal.id.slice(0, 8)}.png`}
        title={`${home} ${match.home_score}:${match.away_score} ${away}`}
        data={{
          goal,
          // nur die drei beteiligten Namen mitgeben, nicht die ganze Saison
          names: Object.fromEntries(
            [goal.pre?.player, goal.assist?.player, goal.scorer]
              .filter((id): id is number => id !== undefined)
              .map((id) => [String(id), season.names[String(id)] ?? t(lang, "common.unknown")]),
          ),
          matchLabel: `${home} ${match.home_score}:${match.away_score} ${away}`,
          context: `${seasonLabel(season.meta)} · ${formatClock(goal.period, goal.minute)}`,
        }}
      />
    </article>
  );
}
