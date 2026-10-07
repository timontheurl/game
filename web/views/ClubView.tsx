import Link from "next/link";
import { notFound } from "next/navigation";
import ClubBadge from "@/components/ClubBadge";
import CountUp from "@/components/CountUp";
import PassNetwork from "@/components/PassNetwork";
import PlayerCard from "@/components/PlayerCard";
import PreAssistMap from "@/components/PreAssistMap";
import RankingTable from "@/components/RankingTable";
import { getClub, playerSlug, seasonLabel, teamSlugs, toCard, topCombos, type Season } from "@/lib/data";
import { t, url, type Lang } from "@/lib/i18n";

function Name({ season, id, lang }: { season: Season; id: number; lang: Lang }) {
  const slug = playerSlug(season, id);
  const name = season.names[String(id)];
  return slug ? <Link href={url(lang, "spieler", slug)}>{name}</Link> : <span>{name}</span>;
}

export default function ClubView({ slug, lang }: { slug: string; lang: Lang }) {
  const club = getClub(slug, lang);
  if (!club) notFound();

  return (
    <>
      <section className="banner club-banner">
        <div className="club-title">
          <ClubBadge name={club.name} size={72} flag={club.flag} />
          <div>
            <span className="banner-kicker">{t(lang, club.flag ? "common.nationalTeam" : "common.club")}</span>
            <h1>{club.name}</h1>
          </div>
        </div>
      </section>

      {club.seasons.map((cs) => {
        const { season } = cs;
        const withPre = cs.goals.filter((g) => g.pre).length;
        const withAssist = cs.goals.filter((g) => g.assist).length;
        const sorted = [...cs.players].sort((a, b) => b.preAssists - a.preAssists || b.involvements - a.involvements);
        const combos = topCombos(season, 6, cs.teamId);
        return (
          <section key={season.meta.slug} className="section">
            <div className="section-head">
              <h2 className="section-title">{seasonLabel(season.meta)}</h2>
              <Link href={url(lang, "wettbewerb", season.meta.slug)} className="text-link">
                {t(lang, "club.leagueRanking")}
              </Link>
            </div>

            <div className="club-facts">
              <div>
                <b>
                  <CountUp value={cs.goals.length} lang={lang} />
                </b>
                <span>{t(lang, "common.goals")}</span>
              </div>
              <div>
                <b>
                  <CountUp value={withAssist} lang={lang} />
                </b>
                <span>{t(lang, "common.withAssist")}</span>
              </div>
              <div className="is-accent">
                <b>
                  <CountUp value={withPre} lang={lang} />
                </b>
                <span>{t(lang, "common.withPre")}</span>
              </div>
              <div>
                <b>
                  <CountUp value={cs.goals.length ? Math.round((withPre / cs.goals.length) * 100) : 0} lang={lang} />{" "}
                  %
                </b>
                <span>{t(lang, "common.share")}</span>
              </div>
            </div>

            <div className="club-split">
              <div className="league-box">
                {sorted.slice(0, 3).map((p) => (
                  <PlayerCard key={p.id} card={toCard(season, p)} lang={lang} />
                ))}
              </div>
              <div>
                <h3 className="sub-title">{t(lang, "club.where")}</h3>
                <PreAssistMap goals={cs.goals} label={`${t(lang, "club.where")}: ${club.name}`} lang={lang} />
              </div>
            </div>

            {cs.goals.some((g) => g.pre) && (
              <>
                <h3 className="sub-title">{t(lang, "net.title")}</h3>
                <PassNetwork goals={cs.goals} names={season.names} lang={lang} />
              </>
            )}

            {combos.length > 0 && (
              <>
                <h3 className="sub-title">{t(lang, "common.mostChains")}</h3>
                <ul className="combo-list">
                  {combos.map((c) => (
                    <li key={`${c.pre}-${c.assist}-${c.scorer}`}>
                      <b className="pl-count">{c.count}×</b>
                      <span className="chain-names">
                        <span className="c-pre">
                          <Name season={season} id={c.pre} lang={lang} />
                        </span>
                        <span className="c-sep">›</span>
                        <span className="c-ast">
                          <Name season={season} id={c.assist} lang={lang} />
                        </span>
                        <span className="c-sep">›</span>
                        <span className="c-goal">
                          <Name season={season} id={c.scorer} lang={lang} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="sub-title">{t(lang, "club.squad")}</h3>
            <RankingTable players={cs.players} teams={season.teams} teamSlugs={teamSlugs(season)} hideTeam lang={lang} />
          </section>
        );
      })}
    </>
  );
}
