import Link from "next/link";
import CardTabs, { type CardTab } from "@/components/CardTabs";
import Pitch from "@/components/Pitch";
import Search from "@/components/Search";
import { getSeasons, hiddenArchitects, playerSlug, seasonLabel, toCard, topCards, topCombos } from "@/lib/data";

export default function Home() {
  const seasons = getSeasons();

  const tabs: CardTab[] = [
    { key: "top", label: "Top Pre-Assists", cards: topCards(16) },
    ...seasons.map((s) => ({
      key: s.meta.slug,
      label: seasonLabel(s.meta),
      cards: s.players.slice(0, 16).map((p) => toCard(s, p)),
      href: `/wettbewerb/${s.meta.slug}/`,
    })),
    {
      key: "architects",
      label: "Stille Architekten",
      cards: hiddenArchitects(16).map(({ season, row }) => toCard(season, row)),
    },
  ];

  const combos = seasons
    .flatMap((s) => topCombos(s, 6).map((c) => ({ s, c })))
    .sort((a, b) => b.c.count - a.c.count)
    .slice(0, 6);

  const example = seasons
    .flatMap((s) => s.goals)
    .find((g) => g.pre && g.assist && g.pre.start[0] < 70 && g.assist.through);

  const name = (s: (typeof seasons)[number], id: number) => {
    const slug = playerSlug(s, id);
    const n = s.names[String(id)];
    return slug ? <Link href={`/spieler/${slug}/`}>{n}</Link> : n;
  };

  return (
    <>
      <section className="hero">
        <h1 className="wordmark">
          Pre<span>Assists</span>
        </h1>
        <p className="hero-sub">Der Pass vor dem Assist. Jedes Tor, bis zum Anfang zurückverfolgt.</p>
        <Search variant="hero" />
      </section>

      <section className="section">
        <CardTabs tabs={tabs} />
      </section>

      <section className="panels">
        <div className="panel panel-violet">
          <div className="panel-head">
            <h2>Ranglisten</h2>
          </div>
          <ul className="panel-list">
            {seasons.map((s) => (
              <li key={s.meta.slug}>
                <Link href={`/wettbewerb/${s.meta.slug}/`}>
                  <span className="pl-title">
                    {seasonLabel(s.meta)}
                    <small>
                      {s.meta.coverage === "team" ? `Nur Spiele von ${s.meta.coverageTeam}` : `${s.meta.matches} Spiele`}
                    </small>
                  </span>
                  <span className="pl-side">
                    {s.players[0]?.name}
                    <b>{s.players[0]?.preAssists}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel panel-green">
          <div className="panel-head">
            <h2>Torketten</h2>
            <span className="panel-meta">Pre-Assist → Assist → Tor</span>
          </div>
          <ul className="panel-list">
            {combos.map(({ s, c }) => (
              <li key={`${s.meta.slug}-${c.pre}-${c.assist}-${c.scorer}`}>
                <div className="chain-row">
                  <span className="pl-title">
                    <span className="chain-names">
                      <span className="c-pre">{name(s, c.pre)}</span>
                      <span className="c-sep">›</span>
                      <span className="c-ast">{name(s, c.assist)}</span>
                      <span className="c-sep">›</span>
                      <span className="c-goal">{name(s, c.scorer)}</span>
                    </span>
                    <small>{seasonLabel(s.meta)}</small>
                  </span>
                  <b className="pl-count">{c.count}×</b>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel panel-teal">
          <div className="panel-head">
            <h2>Was ist ein Pre-Assist?</h2>
          </div>
          {example && <Pitch goal={example} />}
          <p className="panel-text">
            <span className="c-pre">Pre-Assist</span> › <span className="c-ast">Assist</span> ›{" "}
            <span className="c-goal">Tor</span>. Der Pre-Assist ist der Pass zum Vorlagengeber – oft der Moment, in
            dem die Abwehr aufgeht.
          </p>
          <Link href="/methodik/" className="panel-link">
            So zählen wir
          </Link>
        </div>
      </section>
    </>
  );
}
