"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrowHead, shorten } from "@/lib/geom";
import { pick, url, type Lang } from "@/lib/i18n";
import {
  POINTS,
  classify,
  isOpp,
  lerp,
  mirror,
  optionTarget,
  run,
  startPositions,
  type Actor,
  type Outcome,
  type Pt,
  type Result,
  type Run,
  type Scene,
} from "@/lib/passGame";
import { SCENES } from "@/lib/scenes";
import LogoLoader from "./LogoLoader";

// Spiel „Finde den Pre-Assist“: Du hast den Ball und entscheidest, wohin du passt.
// Ziel ist der Pass, der zum Pre-Assist wird – nicht gleich der Assist und kein Fehlpass.

const ROUND = 8;
const BEST_KEY = "preassists-spiel-pre-assist";
const LETTERS = ["A", "B", "C", "D"];

interface Round {
  scene: Scene;
  order: number[]; // Anzeige-Reihenfolge der Optionen
}

interface Played {
  scene: Scene;
  choice: number;
  outcome: Outcome;
  points: number;
}

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function newDeck(): Round[] {
  return shuffle(SCENES)
    .slice(0, ROUND)
    .map((s) => {
      const scene = Math.random() < 0.5 ? mirror(s) : s;
      return { scene, order: shuffle(scene.options.map((_, i) => i)) };
    });
}

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* ohne Speicher geht es auch */
  }
}

export const VERDICT: Record<Outcome, { de: string; en: string; tone: "win" | "half" | "miss" }> = {
  pre: { de: "Pre-Assist!", en: "Pre-assist!", tone: "win" },
  assist: { de: "Das war schon der Assist", en: "That was already the assist", tone: "half" },
  early: { de: "Zu früh", en: "Too early", tone: "miss" },
  nocount: { de: "Tor – aber kein Pre-Assist", en: "Goal – but no pre-assist", tone: "miss" },
  lost: { de: "Fehlpass", en: "Misplaced pass", tone: "miss" },
  nogoal: { de: "Kein Tor", en: "No goal", tone: "miss" },
};

// ---------- Spielfeld ----------

/** Punkt auf einem Linienzug bei Anteil f (nach Länge) */
function along(path: Pt[], f: number): Pt {
  if (path.length < 2) return path[0];
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = Math.min(1, Math.max(0, f)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) return lerp(path[i], path[i + 1], lens[i] ? d / lens[i] : 1);
    d -= lens[i];
  }
  return path[path.length - 1];
}

/** Stand bei Zeit t: Spielerpositionen, Ball, ob der Ball in der Luft ist */
function frame(scene: Scene, r: Run | null, t: number) {
  const pos: Record<Actor, Pt> = startPositions(scene);
  let ball: Pt = scene.you;
  let lift = 0;
  if (!r) return { pos, ball, lift };
  for (const seg of r.segments) {
    if (t < seg.t0) break;
    const f = Math.min(1, (t - seg.t0) / (seg.t1 - seg.t0));
    const ease = f < 1 ? 1 - (1 - f) * (1 - f) : 1;
    for (const m of seg.movers) pos[m.id] = lerp(m.from, m.to, ease);
    ball = along(seg.ball, f);
    lift = seg.air && f < 1 ? Math.sin(Math.PI * f) : 0;
  }
  return { pos, ball, lift };
}

function Markings() {
  return (
    <g className="pitch-markings">
      <rect x={40} y={0} width={80} height={80} />
      <line x1={60} y1={0} x2={60} y2={80} />
      <circle cx={60} cy={40} r={10} />
      <rect x={102} y={18} width={18} height={44} />
      <rect x={114} y={30} width={6} height={20} />
      <rect x={120} y={36} width={1.6} height={8} className="pg-goal" />
      <circle cx={108} cy={40} r={0.4} className="spot" />
      <path d="M 102 32.7 A 10 10 0 0 0 102 47.3" />
    </g>
  );
}

type Trail = { step: number; from: Pt; to: Pt[]; role: "pre" | "assist" | "yours" | "pass" | "shot" | "carry"; air: boolean };

function PassPitch({
  scene,
  lang,
  order,
  phase,
  hover,
  setHover,
  onPick,
  r,
  result,
  shown,
  t,
}: {
  scene: Scene;
  lang: Lang;
  order: number[];
  phase: "choose" | "play" | "result";
  hover: number | null;
  setHover: (i: number | null) => void;
  onPick: (i: number) => void;
  r: Run | null;
  result: Result | null;
  shown: number | null;
  t: number;
}) {
  const { pos, ball, lift } = frame(scene, r, t);
  const opt = shown !== null ? scene.options[shown] : null;

  // Bisher gespielte Abschnitte als Linien, nach dem Ende eingefärbt
  const trails: Trail[] = [];
  if (r && opt) {
    for (const seg of r.segments) {
      if (t < seg.t0) break;
      const st = opt.steps[seg.step];
      const f = Math.min(1, (t - seg.t0) / (seg.t1 - seg.t0));
      const done = seg.ball.length > 2 ? [seg.ball[0], ...seg.ball.slice(1, -1), along(seg.ball, f)] : [along(seg.ball, f)];
      const role: Trail["role"] =
        phase === "result" && result
          ? seg.step === result.pre
            ? "pre"
            : seg.step === result.assist
              ? "assist"
              : seg.step === 0
                ? "yours"
                : st.k === "shot" || st.k === "foul"
                  ? "shot"
                  : st.k === "carry"
                    ? "carry"
                    : "pass"
          : seg.step === 0
            ? "yours"
            : st.k === "shot" || st.k === "foul"
              ? "shot"
              : st.k === "carry"
                ? "carry"
                : "pass";
      if (seg.ball[0][0] === seg.ball[seg.ball.length - 1][0] && seg.ball[0][1] === seg.ball[seg.ball.length - 1][1]) continue;
      trails.push({ step: seg.step, from: seg.ball[0], to: done, role, air: seg.air });
    }
  }

  // Beschriftung der Rollen nach dem Ablauf
  const badges: { at: Pt; text: string; cls: string }[] = [];
  if (phase === "result" && r && result && opt) {
    const mid = (i: number) => {
      const seg = r.segments.find((s) => s.step === i);
      return seg ? along(seg.ball, 0.5) : null;
    };
    const add = (i: number | undefined, text: string, cls: string) => {
      if (i === undefined) return;
      const at = mid(i);
      if (at) badges.push({ at, text, cls });
    };
    add(result.pre, "Pre-Assist", "pre");
    add(result.assist, "Assist", "assist");
    if (result.pre !== 0 && result.assist !== 0) add(0, pick(lang, "Dein Pass", "Your pass"), "yours");
  }

  const goalScored = phase === "result" && result?.goal;
  const you = pos.you;

  return (
    <svg viewBox="38.5 -1.5 85 83" className="pitch pg-pitch" role="img" aria-label={pick(lang, "Spielfeld mit der Spielsituation", "Pitch showing the situation")}>
      <Markings />
      {goalScored && <rect x={120} y={36} width={1.6} height={8} className="pg-net" />}

      {/* Optionen vor der Entscheidung */}
      {phase === "choose" &&
        order.map((oi, n) => {
          const target = optionTarget(scene, scene.options[oi]).at;
          const end = shorten(you, target, 2.6);
          const active = hover === oi;
          return (
            <g
              key={oi}
              className={`pg-option ${active ? "is-active" : ""}`}
              onClick={() => onPick(oi)}
              onMouseEnter={() => setHover(oi)}
              onMouseLeave={() => setHover(null)}
            >
              <line x1={you[0]} y1={you[1]} x2={end[0]} y2={end[1]} className="pg-option-line" />
              <polygon points={arrowHead(you, end, 2.2, 2)} className="pg-option-head" />
              <line x1={you[0]} y1={you[1]} x2={target[0]} y2={target[1]} className="pg-option-hit" />
              <g transform={`translate(${target[0]} ${target[1] - 4.2})`}>
                <circle r={2.2} className="pg-letter" />
                <text y={0.85} textAnchor="middle" className="pg-letter-text">
                  {LETTERS[n]}
                </text>
              </g>
            </g>
          );
        })}

      {trails.map((tr, i) => {
        const pts = [tr.from, ...tr.to];
        return (
          <polyline
            key={i}
            points={pts.map((p) => p.join(",")).join(" ")}
            className={`pg-trail is-${tr.role} ${tr.air ? "is-air" : ""}`}
          />
        );
      })}

      {/* Spieler */}
      {Object.entries(pos).map(([id, p]) => {
        if (id === "you") return null;
        const opp = isOpp(id);
        const target = phase === "choose" && order.some((oi) => optionTarget(scene, scene.options[oi]).who === id);
        return (
          <g
            key={id}
            transform={`translate(${p[0]} ${p[1]})`}
            className={`pg-player ${opp ? (id === "o0" ? "is-keeper" : "is-opp") : "is-mate"} ${target ? "is-target" : ""}`}
            onClick={
              target
                ? () => {
                    const oi = order.find((o) => optionTarget(scene, scene.options[o]).who === id);
                    if (oi !== undefined) onPick(oi);
                  }
                : undefined
            }
          >
            <circle r={2.1} />
            {!opp && (
              <text y={0.78} textAnchor="middle">
                {id}
              </text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${you[0]} ${you[1]})`} className={`pg-player is-you ${phase === "choose" ? "is-waiting" : ""}`}>
        {phase === "choose" && <circle r={2.4} className="pg-pulse" />}
        <circle r={2.4} />
        <text y={0.6} textAnchor="middle">
          {pick(lang, "DU", "YOU")}
        </text>
      </g>

      {/* Ball */}
      {phase !== "choose" && (
        <g transform={`translate(${ball[0]} ${ball[1]})`}>
          {lift > 0 && <ellipse cx={0} cy={1.2 + lift * 1.6} rx={0.9} ry={0.35} className="pg-ball-shadow" />}
          <circle r={0.95 + lift * 0.55} cy={-lift * 1.6} className="pg-ball" />
        </g>
      )}

      {/* Ballverlust markieren */}
      {phase === "result" && r && result && !result.goal && (
        <circle cx={r.ballEnd[0]} cy={r.ballEnd[1]} r={3.4} className="pg-lost" />
      )}

      {badges.map((b, i) => (
        <g key={i} transform={`translate(${b.at[0]} ${b.at[1] - 2.6})`} className={`pg-badge is-${b.cls}`}>
          <rect x={-(b.text.length * 0.62 + 1.4)} y={-1.9} width={b.text.length * 1.24 + 2.8} height={3.2} rx={1.2} />
          <text y={0.35} textAnchor="middle">
            {b.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------- Spiel ----------

export default function PassGame({ lang }: { lang: Lang }) {
  const [deck, setDeck] = useState<Round[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"choose" | "play" | "result">("choose");
  const [shown, setShown] = useState<number | null>(null); // gerade gezeigte Option
  const [choice, setChoice] = useState<number | null>(null); // gewertete Wahl
  const [hover, setHover] = useState<number | null>(null);
  const [played, setPlayed] = useState<Played[]>([]);
  const [best, setBest] = useState(0);
  const [t, setT] = useState(0);
  const [over, setOver] = useState(false);
  const raf = useRef(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Zufall erst im Browser – sonst passt das vorgerenderte HTML nicht
  useEffect(() => {
    setDeck(newDeck());
    setBest(loadBest());
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const round = deck?.[idx] ?? null;
  const scene = round?.scene ?? null;
  const r = useMemo(() => (scene && shown !== null ? run(scene, scene.options[shown]) : null), [scene, shown]);
  const result = useMemo(() => (scene && shown !== null ? classify(scene, scene.options[shown]) : null), [scene, shown]);
  const score = played.reduce((a, p) => a + p.points, 0);
  const finished = over;

  const animate = useCallback((total: number) => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(total);
      setPhase("result");
      return;
    }
    let last = performance.now();
    let now = 0;
    setT(0);
    const tick = (ts: number) => {
      now += Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (now >= total) {
        setT(total);
        setPhase("result");
        return;
      }
      setT(now);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const watch = useCallback(
    (oi: number) => {
      if (!scene) return;
      // Am Handy liegt das Spielfeld oft über dem Bildschirmrand – zum Ablauf hinscrollen
      const box = fieldRef.current?.getBoundingClientRect();
      if (box && (box.top < 56 || box.bottom > window.innerHeight)) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        fieldRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      }
      setShown(oi);
      setPhase("play");
      animate(run(scene, scene.options[oi]).total);
    },
    [scene, animate],
  );

  const pickOption = useCallback(
    (oi: number) => {
      if (!scene || phase !== "choose") return;
      const outcome = classify(scene, scene.options[oi]).outcome;
      setChoice(oi);
      setHover(null);
      setPlayed((p) => [...p, { scene, choice: oi, outcome, points: POINTS[outcome] }]);
      watch(oi);
    },
    [scene, phase, watch],
  );

  const skip = () => {
    if (!r) return;
    cancelAnimationFrame(raf.current);
    setT(r.total);
    setPhase("result");
  };

  const toTop = () => {
    const top = boxRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const next = () => {
    if (!deck) return;
    cancelAnimationFrame(raf.current);
    setIdx((i) => i + 1);
    setPhase("choose");
    setShown(null);
    setChoice(null);
    setT(0);
    toTop();
  };

  const restart = () => {
    cancelAnimationFrame(raf.current);
    setDeck(newDeck());
    setIdx(0);
    setPlayed([]);
    setPhase("choose");
    setShown(null);
    setChoice(null);
    setT(0);
    setOver(false);
    toTop();
  };

  // Nach der letzten Situation: Auswertung zeigen und Bestwert sichern
  useEffect(() => {
    if (!deck || over || phase !== "result" || played.length !== deck.length) return;
    setOver(true);
    if (score > best) {
      setBest(score);
      saveBest(score);
    }
  }, [deck, over, phase, played.length, score, best]);

  // Nach dem Ablauf den Fokus auf „Weiter“, damit man mit der Tastatur durchspielen kann
  useEffect(() => {
    if (phase === "result" && shown === choice) nextRef.current?.focus({ preventScroll: true });
  }, [phase, shown, choice]);

  if (!deck || !scene || !round) return <LogoLoader label={pick(lang, "Lade Spielszenen …", "Loading situations …")} />;

  const verdict = result ? VERDICT[result.outcome] : null;
  const isReplay = shown !== null && shown !== choice;
  const letterOf = (oi: number) => LETTERS[round.order.indexOf(oi)];

  return (
    <div className="pg" ref={boxRef}>
      <div className="game-score pg-score" aria-live="polite">
        <span>
          {pick(lang, "Situation", "Situation")}
          <b>
            {Math.min(idx + 1, deck.length)}/{deck.length}
          </b>
        </span>
        <span>
          {pick(lang, "Punkte", "Points")}
          <b>{score}</b>
        </span>
        <span>
          {pick(lang, "Rekord", "Best")}
          <b>{best}</b>
        </span>
      </div>

      <div className="pg-layout">
        <div className="pg-field" ref={fieldRef}>
          <PassPitch
            scene={scene}
            lang={lang}
            order={round.order}
            phase={phase}
            hover={hover}
            setHover={setHover}
            onPick={pickOption}
            r={r}
            result={result}
            shown={shown}
            t={t}
          />
          {phase === "result" && verdict && result && (
            <div className={`pg-flash is-${verdict.tone}`} aria-hidden="true">
              {verdict[lang]}
              {!isReplay && <b>+{POINTS[result.outcome]}</b>}
            </div>
          )}
          <ul className="pg-legend" aria-hidden="true">
            <li>
              <i className="is-you" /> {pick(lang, "Du", "You")}
            </li>
            <li>
              <i className="is-mate" /> {pick(lang, "Mitspieler", "Teammates")}
            </li>
            <li>
              <i className="is-opp" /> {pick(lang, "Gegner", "Opponents")}
            </li>
            <li>
              <i className="is-keeper" /> {pick(lang, "Tormann", "Goalkeeper")}
            </li>
          </ul>
        </div>

        <div className="pg-panel">
          <span className="league-kicker">{scene.title[lang]}</span>
          <p className="pg-setup">{scene.setup[lang]}</p>

          {phase === "choose" && (
            <>
              <p className="pg-question">{pick(lang, "Welcher Pass wird zum Pre-Assist?", "Which pass becomes the pre-assist?")}</p>
              <div className="pg-options">
                {round.order.map((oi, n) => (
                  <button
                    key={oi}
                    type="button"
                    className={`pg-choice ${hover === oi ? "is-active" : ""}`}
                    onClick={() => pickOption(oi)}
                    onMouseEnter={() => setHover(oi)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(oi)}
                    onBlur={() => setHover(null)}
                  >
                    <span className="pg-choice-letter">{LETTERS[n]}</span>
                    {scene.options[oi].label[lang]}
                  </button>
                ))}
              </div>
            </>
          )}

          {phase === "play" && (
            <div className="pg-playing">
              <p className="muted">
                {isReplay ? pick(lang, "So wäre es gelaufen …", "Here's how it would have gone …") : pick(lang, "Der Ball läuft …", "The ball is rolling …")}
              </p>
              <button type="button" className="btn btn-ghost btn-small" onClick={skip}>
                {pick(lang, "Überspringen", "Skip")}
              </button>
            </div>
          )}

          {phase === "result" && verdict && result && shown !== null && (
            <div className={`pg-result is-${verdict.tone}`} role="status">
              <p className="pg-verdict">
                {isReplay && <small>{pick(lang, `Option ${letterOf(shown)}:`, `Option ${letterOf(shown)}:`)} </small>}
                {verdict[lang]}
                {!isReplay && <span className="pg-points">+{POINTS[result.outcome]}</span>}
              </p>
              <p>{scene.options[shown].explain[lang]}</p>
            </div>
          )}

          {phase !== "choose" && choice !== null && (
            <div className="pg-others">
              <span className="pg-others-title">{pick(lang, "Was wäre passiert?", "What would have happened?")}</span>
              <ul>
                {round.order.map((oi) => {
                  const o = classify(scene, scene.options[oi]).outcome;
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        className={`pg-other is-${VERDICT[o].tone} ${shown === oi ? "is-shown" : ""}`}
                        onClick={() => watch(oi)}
                        disabled={phase === "play"}
                      >
                        <span className="pg-choice-letter">{letterOf(oi)}</span>
                        <span className="pg-other-label">{scene.options[oi].label[lang]}</span>
                        <span className="pg-other-verdict">
                          {VERDICT[o][lang]}
                          {oi === choice && <em>{pick(lang, " · deine Wahl", " · your pick")}</em>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {phase === "result" && !finished && (
            <button ref={nextRef} type="button" className="btn pg-next" onClick={next}>
              {pick(lang, "Nächste Situation", "Next situation")} ›
            </button>
          )}
        </div>
      </div>

      {finished && (
        <div className="pg-final">
          <h2>
            {score} / {deck.length * POINTS.pre} {pick(lang, "Punkte", "points")}
          </h2>
          <p>{rating(score, deck.length * POINTS.pre, lang)}</p>
          <ol className="pg-final-list">
            {played.map((p, i) => (
              <li key={i} className={`is-${VERDICT[p.outcome].tone}`}>
                <span>{p.scene.title[lang]}</span>
                <span>
                  {VERDICT[p.outcome][lang]} · +{p.points}
                </span>
              </li>
            ))}
          </ol>
          <div className="player-actions">
            <button type="button" className="btn" onClick={restart}>
              {pick(lang, "Nochmal spielen", "Play again")}
            </button>
            <ShareResult played={played} score={score} max={deck.length * POINTS.pre} lang={lang} />
            <Link href={url(lang, "spiele")} className="btn btn-ghost">
              {pick(lang, "Alle Spiele", "All games")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ergebnis als Text teilen – wie bei Wordle mit farbigen Kästchen je Situation */
function ShareResult({ played, score, max, lang }: { played: Played[]; score: number; max: number; lang: Lang }) {
  const [state, setState] = useState<"idle" | "copied">("idle");
  const share = async () => {
    const boxes = played.map((p) => (p.outcome === "pre" ? "🟩" : p.outcome === "assist" ? "🟨" : "⬛")).join("");
    const title = pick(lang, "Finde den Pre-Assist", "Find the pre-assist");
    const text = `${title}: ${score}/${max} ${boxes}`;
    const link = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: link });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      /* abgebrochen */
    }
  };
  return (
    <button type="button" className="btn btn-ghost" onClick={share}>
      {state === "copied" ? pick(lang, "Kopiert!", "Copied!") : pick(lang, "Ergebnis teilen", "Share result")}
    </button>
  );
}

function rating(score: number, max: number, lang: Lang) {
  const q = score / max;
  if (q >= 0.9) return pick(lang, "Weltklasse – du liest das Spiel wie ein Zehner.", "World class – you read the game like a number 10.");
  if (q >= 0.65) return pick(lang, "Starker Spielmacher! Kaum ein Pre-Assist entgeht dir.", "Strong playmaker! Hardly a pre-assist gets past you.");
  if (q >= 0.4) return pick(lang, "Solide – aber manchmal spielst du schon den Assist.", "Solid – but sometimes you go straight for the assist.");
  return pick(lang, "Da geht noch was. Denk einen Pass weiter!", "Room to grow. Think one pass further ahead!");
}
