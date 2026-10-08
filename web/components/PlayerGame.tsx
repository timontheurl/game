"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardFace, Flag } from "./PlayerCard";
import { initials } from "@/lib/cards";
import { pick, url, type Lang } from "@/lib/i18n";
import type { CompareEntry } from "@/lib/indexes";
import LogoLoader from "./LogoLoader";

type Mode = "duell" | "raten";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// Bestwerte nur im eigenen Browser; ohne Speicher (z. B. privater Modus) läuft das Spiel trotzdem
function loadBest(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* egal */
  }
}

/** Spielerkarte für das Spiel: zeigt die Pre-Assists erst, wenn sie aufgedeckt sind. */
function GameCard({ entry, shown, state }: { entry: CompareEntry; shown: boolean; state?: "win" | "lose" }) {
  return (
    <div className={`pcard pcard-lg game-card ${state ? `is-${state}` : ""}`}>
      <CardFace
        rating={shown ? entry.preAssists : "?"}
        ratingClass={shown ? "is-shown" : "is-hidden"}
        position={entry.position}
        country={entry.country}
        countryName={entry.countryName}
        team={entry.team}
        name={entry.name}
        bottom={
          <>
            {entry.team}
            <small>{entry.season}</small>
          </>
        }
      />
    </div>
  );
}

// ---------- Modus 1: Mehr oder weniger ----------

function Duel({ pool, lang }: { pool: CompareEntry[]; lang: Lang }) {
  const BEST = "preassists-spiel-duell";
  const draw = useCallback(
    (other?: CompareEntry) => {
      // Gleichstand vermeiden, sonst gibt es keine richtige Antwort
      const options = other ? pool.filter((e) => e.preAssists !== other.preAssists && e.slug !== other.slug) : pool;
      return random(options);
    },
    [pool],
  );

  const [left, setLeft] = useState<CompareEntry | null>(null);
  const [right, setRight] = useState<CompareEntry | null>(null);
  const [phase, setPhase] = useState<"guess" | "right" | "wrong">("guess");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const start = useCallback(() => {
    const a = draw();
    setLeft(a);
    setRight(draw(a));
    setStreak(0);
    setPhase("guess");
  }, [draw]);

  // Erst im Browser auslosen, damit Server- und Browser-Fassung übereinstimmen
  useEffect(() => {
    start();
    setBest(loadBest(BEST));
  }, [start]);

  if (!left || !right) return null;

  const guess = (higher: boolean) => {
    if (phase !== "guess") return;
    const correct = higher ? right.preAssists > left.preAssists : right.preAssists < left.preAssists;
    if (!correct) {
      setPhase("wrong");
      return;
    }
    const next = streak + 1;
    setStreak(next);
    if (next > best) {
      setBest(next);
      saveBest(BEST, next);
    }
    setPhase("right");
    // Kurz zeigen, dann rückt der rechte Spieler nach links und ein neuer kommt dazu
    setTimeout(() => {
      setLeft(right);
      setRight(draw(right));
      setPhase("guess");
    }, 1300);
  };

  return (
    <div className="game">
      <div className="game-score" aria-live="polite">
        <span>
          {pick(lang, "Serie", "Streak")} <b>{streak}</b>
        </span>
        <span>
          {pick(lang, "Rekord", "Best")} <b>{best}</b>
        </span>
      </div>

      <div className="duel">
        <div className="duel-side duel-left">
          <GameCard entry={left} shown />
          <p className="duel-caption">
            <b>{left.preAssists}</b> {pick(lang, "Pre-Assists", "pre-assists")}
          </p>
        </div>

        <div className="duel-center">
          <span className="duel-vs" aria-hidden="true">
            VS
          </span>
          {phase === "guess" && (
            <div className="duel-buttons">
              <p className="duel-question">
                {pick(lang, `Hat ${right.name} mehr oder weniger?`, `Does ${right.name} have more or fewer?`)}
              </p>
              <button type="button" className="btn" onClick={() => guess(true)}>
                ▲ {pick(lang, "Mehr", "More")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => guess(false)}>
                ▼ {pick(lang, "Weniger", "Fewer")}
              </button>
            </div>
          )}
        </div>

        <div className="duel-side duel-right" key={right.key}>
          <GameCard
            entry={right}
            shown={phase !== "guess"}
            state={phase === "right" ? "win" : phase === "wrong" ? "lose" : undefined}
          />
          <p className="duel-caption">
            <b>{phase === "guess" ? "?" : right.preAssists}</b> {pick(lang, "Pre-Assists", "pre-assists")}
            {phase === "right" && <span className="game-hit"> ✓</span>}
          </p>
        </div>
      </div>

      {phase === "wrong" && (
        <div className="game-over">
          <h2>{pick(lang, "Daneben!", "Wrong!")}</h2>
          <p>
            {pick(
              lang,
              `${right.name} hatte ${right.preAssists} Pre-Assists, ${left.name} ${left.preAssists}. Deine Serie: ${streak}.`,
              `${right.name} had ${right.preAssists} pre-assists, ${left.name} ${left.preAssists}. Your streak: ${streak}.`,
            )}
          </p>
          <div className="player-actions">
            <button type="button" className="btn" onClick={start}>
              {pick(lang, "Nochmal spielen", "Play again")}
            </button>
            <Link href={url(lang, "spieler", right.slug)} className="btn btn-ghost">
              {pick(lang, `Profil von ${right.name}`, `${right.name}'s profile`)}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Modus 2: Wer ist es? ----------

const MAX_CLUES = 6;

function Guess({ pool, all, lang }: { pool: CompareEntry[]; all: CompareEntry[]; lang: Lang }) {
  const BEST = "preassists-spiel-raten";
  const [target, setTarget] = useState<CompareEntry | null>(null);
  const [clues, setClues] = useState(1);
  const [wrong, setWrong] = useState<string[]>([]);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const [query, setQuery] = useState("");
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);

  const next = useCallback(() => {
    setTarget(random(pool));
    setClues(1);
    setWrong([]);
    setResult(null);
    setQuery("");
  }, [pool]);

  useEffect(() => {
    next();
    setBest(loadBest(BEST));
  }, [next]);

  // Jeder Spieler nur einmal in der Auswahl, auch wenn er mehrere Saisons hat
  const names = useMemo(() => {
    const seen = new Map<string, CompareEntry>();
    for (const e of all) if (!seen.has(e.slug)) seen.set(e.slug, e);
    return [...seen.values()];
  }, [all]);
  const q = norm(query.trim());
  const suggestions = q.length >= 2 ? names.filter((e) => norm(e.name).includes(q)).slice(0, 6) : [];

  if (!target) return null;

  const revealNext = () => {
    if (clues >= MAX_CLUES) setResult("lost");
    else setClues((c) => c + 1);
  };

  const submit = (e: CompareEntry) => {
    setQuery("");
    if (result) return;
    if (e.slug === target.slug) {
      // Je weniger Hinweise, desto mehr Punkte
      const total = points + (MAX_CLUES + 1 - clues);
      setPoints(total);
      if (total > best) {
        setBest(total);
        saveBest(BEST, total);
      }
      setResult("won");
    } else {
      setWrong((w) => [...w, e.name]);
      revealNext();
    }
  };

  const restart = () => {
    setPoints(0);
    next();
  };

  const clueList: { label: string; value: React.ReactNode }[] = [
    {
      label: pick(lang, "Pre-Assists", "Pre-assists"),
      value: (
        <>
          <b className="clue-big">{target.preAssists}</b> {pick(lang, "in", "in")} {target.season}
        </>
      ),
    },
    { label: pick(lang, "Position", "Position"), value: target.position ?? "–" },
    {
      label: pick(lang, "Assists und Tore", "Assists and goals"),
      value: pick(lang, `${target.assists} Assists, ${target.goals} Tore`, `${target.assists} assists, ${target.goals} goals`),
    },
    {
      label: pick(lang, "Nation", "Nation"),
      value: (
        <>
          <Flag code={target.country} /> {target.countryName ?? "–"}
        </>
      ),
    },
    { label: pick(lang, "Team", "Team"), value: target.team },
    { label: pick(lang, "Initialen", "Initials"), value: initials(target.name).split("").join(". ") + "." },
  ];

  return (
    <div className="game">
      <div className="game-score" aria-live="polite">
        <span>
          {pick(lang, "Punkte", "Points")} <b>{points}</b>
        </span>
        <span>
          {pick(lang, "Rekord", "Best")} <b>{best}</b>
        </span>
      </div>

      <div className="guess">
        <ol className="clues">
          {clueList.map((c, i) => (
            <li key={c.label} className={i < clues || result ? "is-open" : ""} style={{ "--i": i } as React.CSSProperties}>
              <span className="clue-label">
                {pick(lang, "Hinweis", "Clue")} {i + 1} · {c.label}
              </span>
              <span className="clue-value">{i < clues || result ? c.value : "?"}</span>
            </li>
          ))}
        </ol>

        <div className="guess-panel">
          {result ? (
            <div className={`guess-result is-${result}`}>
              <GameCard entry={target} shown state={result === "won" ? "win" : "lose"} />
              <h2>
                {result === "won"
                  ? pick(lang, `Richtig! +${MAX_CLUES + 1 - clues} Punkte`, `Correct! +${MAX_CLUES + 1 - clues} points`)
                  : pick(lang, `Gesucht war ${target.name}`, `It was ${target.name}`)}
              </h2>
              <div className="player-actions">
                {result === "won" ? (
                  <button type="button" className="btn" onClick={next}>
                    {pick(lang, "Nächster Spieler", "Next player")}
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={restart}>
                    {pick(lang, "Neue Runde", "New game")}
                  </button>
                )}
                <Link href={url(lang, "spieler", target.slug)} className="btn btn-ghost">
                  {pick(lang, "Zum Profil", "View profile")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="muted">
                {pick(
                  lang,
                  "Wer ist gesucht? Jeder falsche Tipp deckt einen weiteren Hinweis auf. Je früher du richtig liegst, desto mehr Punkte.",
                  "Who is it? Every wrong guess reveals another clue. The earlier you get it right, the more points you score.",
                )}
              </p>
              <div className="picker">
                <input
                  type="search"
                  value={query}
                  placeholder={pick(lang, "Spieler eingeben …", "Type a player …")}
                  aria-label={pick(lang, "Spieler raten", "Guess the player")}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && suggestions[0] && submit(suggestions[0])}
                />
                {suggestions.length > 0 && (
                  <ul className="search-results">
                    {suggestions.map((s) => (
                      <li key={s.slug}>
                        <button type="button" onClick={() => submit(s)}>
                          <span className="sr-pos">{s.position ?? "–"}</span>
                          <span className="sr-name">
                            {s.name}
                            <small>{s.team}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="player-actions">
                <button type="button" className="btn btn-ghost btn-small" onClick={revealNext}>
                  {clues < MAX_CLUES ? pick(lang, "Nächster Hinweis", "Next clue") : pick(lang, "Aufgeben", "Give up")}
                </button>
              </div>
              {wrong.length > 0 && (
                <ul className="wrong-guesses">
                  {wrong.map((w, i) => (
                    <li key={`${w}-${i}`}>✗ {w}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Rahmen ----------

export default function PlayerGame({ lang }: { lang: Lang }) {
  const [entries, setEntries] = useState<CompareEntry[] | null>(null);
  const [mode, setMode] = useState<Mode>("duell");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("modus") === "raten") setMode("raten");
    fetch(lang === "en" ? "/daten/spieler-en.json" : "/daten/spieler.json")
      .then((r) => r.json())
      .then(setEntries);
  }, [lang]);

  const choose = (m: Mode) => {
    setMode(m);
    const u = new URL(window.location.href);
    u.searchParams.set("modus", m);
    window.history.replaceState(null, "", u);
  };

  // Für das Duell genügen ein paar Pre-Assists; zum Raten nur bekanntere Spieler mit vielen
  const duelPool = useMemo(() => entries?.filter((e) => e.preAssists >= 2) ?? [], [entries]);
  const guessPool = useMemo(() => entries?.filter((e) => e.preAssists >= 5) ?? [], [entries]);

  return (
    <>
      <div className="pills game-modes" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "duell"}
          className={`pill ${mode === "duell" ? "is-active" : ""}`}
          onClick={() => choose("duell")}
        >
          {pick(lang, "Mehr oder weniger", "Higher or lower")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "raten"}
          className={`pill ${mode === "raten" ? "is-active" : ""}`}
          onClick={() => choose("raten")}
        >
          {pick(lang, "Wer ist es?", "Who is it?")}
        </button>
      </div>
      {!entries ? (
        <LogoLoader label={pick(lang, "Lade Spieler …", "Loading players …")} />
      ) : mode === "duell" ? (
        <Duel pool={duelPool} lang={lang} />
      ) : (
        <Guess pool={guessPool} all={entries} lang={lang} />
      )}
    </>
  );
}
