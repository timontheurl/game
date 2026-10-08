"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrowHead, shorten } from "@/lib/geom";
import { countryName, pick, url, type Lang } from "@/lib/i18n";
import {
  POINTS,
  classify,
  isOpp,
  lerp,
  letterSpots,
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
  type Text,
} from "@/lib/passGame";
import LogoLoader from "./LogoLoader";

// Spiel „Finde den Pre-Assist“: Du hast den Ball und entscheidest, wohin du passt.
// Ziel ist der Pass, der zum Pre-Assist wird – nicht gleich der Assist und kein Fehlpass.

const ROUND = 8;
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

type Phase = "choose" | "play" | "result";

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Echte Szenen liegen je Bewerb in /daten/szenen/<slug>.json und werden nur bei Bedarf geladen
interface SceneIndex {
  slug: string;
  name: Text;
  count: number;
}

const seasonCache = new Map<string, Promise<Scene[]>>();
function loadSeason(slug: string): Promise<Scene[]> {
  let p = seasonCache.get(slug);
  if (!p) {
    p = fetch(`/daten/szenen/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Scene[]>;
    });
    p.catch(() => seasonCache.delete(slug));
    seasonCache.set(slug, p);
  }
  return p;
}

/** Zieht zufällig ROUND Szenen aus den gewählten Bewerben (gewichtet nach Anzahl) */
async function newDeck(index: SceneIndex[], filter: string): Promise<Round[]> {
  const pool = filter === ALL ? index : index.filter((s) => s.slug === filter);
  const total = pool.reduce((a, s) => a + s.count, 0);
  const picks = new Set<number>();
  while (picks.size < Math.min(ROUND, total)) picks.add(Math.floor(Math.random() * total));
  const wanted: { slug: string; i: number }[] = [];
  for (const n of picks) {
    let rest = n;
    for (const s of pool) {
      if (rest < s.count) {
        wanted.push({ slug: s.slug, i: rest });
        break;
      }
      rest -= s.count;
    }
  }
  const seasons = new Map(
    await Promise.all([...new Set(wanted.map((w) => w.slug))].map(async (slug) => [slug, await loadSeason(slug)] as const)),
  );
  return shuffle(wanted)
    .map((w) => seasons.get(w.slug)?.[w.i])
    .filter((s): s is Scene => !!s)
    .map((s) => {
      const scene = mirror(s);
      return { scene, order: shuffle(scene.options.map((_, i) => i)) };
    });
}

const ALL = "alle";

/** „Heim – Gast“; Nationalteams in der Sprache der Seite */
function sceneTitle(scene: Scene, lang: Lang) {
  const m = scene.meta;
  if (!m) return scene.title[lang];
  const home = countryName(m.homeCode ?? null, m.home, lang) ?? m.home;
  const away = countryName(m.awayCode ?? null, m.away, lang) ?? m.away;
  return `${home} – ${away}`;
}

const BEST_KEY = "preassists-spiel-pre-assist";

function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function storeBestScore(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* ohne Speicher geht es auch */
  }
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const VERDICT: Record<Outcome, { de: string; en: string; tone: "win" | "half" | "miss" }> = {
  pre: { de: "Pre-Assist!", en: "Pre-assist!", tone: "win" },
  assist: { de: "Schon der Assist", en: "Already the assist", tone: "half" },
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

/** Bereits zurückgelegter Teil eines Linienzugs (Zwischenpunkte erst, wenn der Ball dort war) */
function travelled(path: Pt[], f: number): Pt[] {
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const d = Math.min(1, Math.max(0, f)) * total;
  const out: Pt[] = [path[0]];
  let sum = 0;
  for (let i = 0; i < lens.length - 1; i++) {
    sum += lens[i];
    if (d >= sum) out.push(path[i + 1]);
  }
  out.push(along(path, f));
  return out;
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

/**
 * Ausschnitt je Szene: alles, was in irgendeiner Option passiert, plus Tor – quadratisch und
 * mit etwas Rand. So ist das Geschehen am Handy deutlich größer als mit der ganzen Hälfte.
 */
function sceneView(scene: Scene): [number, number, number] {
  // Nur das Geschehen zählt: du, alle Laufwege und Pässe der Optionen und das Tor
  const pts: Pt[] = [scene.you, [121.6, 36], [121.6, 44]];
  for (const o of scene.options) {
    const r = run(scene, o);
    for (const seg of r.segments) {
      pts.push(...seg.ball);
      for (const m of seg.movers) pts.push(m.to);
    }
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 7;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad - 3; // hinter dem Tor reicht weniger Rand
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const size = Math.min(124, Math.max(52, maxX - minX, maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const x0 = clamp(cx - size / 2, -2, 124 - size);
  const y0 = size >= 88 ? 40 - size / 2 : clamp(cy - size / 2, -4, 84 - size);
  return [x0, y0, size];
}

function Markings() {
  return (
    <g className="pitch-markings">
      <rect x={0} y={0} width={120} height={80} />
      <line x1={60} y1={0} x2={60} y2={80} />
      <circle cx={60} cy={40} r={10} />
      <rect x={102} y={18} width={18} height={44} />
      <rect x={114} y={30} width={6} height={20} />
      <rect x={120} y={36} width={1.6} height={8} className="pg-goal" />
      <circle cx={108} cy={40} r={0.4} className="spot" />
      <path d="M 102 32.7 A 10 10 0 0 0 102 47.3" />
      <rect x={0} y={18} width={18} height={44} />
      <rect x={0} y={30} width={6} height={20} />
      <circle cx={12} cy={40} r={0.4} className="spot" />
      <path d="M 18 32.7 A 10 10 0 0 1 18 47.3" />
    </g>
  );
}

type Trail = { from: Pt; to: Pt[]; role: "pre" | "assist" | "yours" | "pass" | "shot" | "carry"; air: boolean };
type Badge = { at: Pt; text: string; cls: string };

const badgeWidth = (text: string) => text.length * 1.24 + 2.8;

function PassPitch({
  scene,
  view,
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
  view: [number, number, number];
  lang: Lang;
  order: number[];
  phase: Phase;
  hover: number | null;
  setHover: (i: number | null) => void;
  onPick: (i: number) => void;
  r: Run | null;
  result: Result | null;
  shown: number | null;
  t: number;
}) {
  const { pos, ball, lift } = frame(scene, r, t);
  const names = scene.names ?? {};
  const opt = shown !== null ? scene.options[shown] : null;
  const [vx, vy, vs] = view;
  const inView = (p: Pt, m: number) => p[0] > vx + m && p[0] < vx + vs - m && p[1] > vy + m && p[1] < vy + vs - m;

  // Bisher gespielte Abschnitte als Linien, nach dem Ende eingefärbt
  const trails: Trail[] = [];
  if (r && opt) {
    for (const seg of r.segments) {
      if (t < seg.t0) break;
      const st = opt.steps[seg.step];
      const first = seg.ball[0];
      const last = seg.ball[seg.ball.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) continue;
      const f = Math.min(1, (t - seg.t0) / (seg.t1 - seg.t0));
      const plain: Trail["role"] = seg.step === 0 ? "yours" : st.k === "shot" || st.k === "foul" ? "shot" : st.k === "carry" ? "carry" : "pass";
      const role: Trail["role"] =
        phase === "result" && result ? (seg.step === result.pre ? "pre" : seg.step === result.assist ? "assist" : plain) : plain;
      const path = travelled(seg.ball, f);
      trails.push({ from: path[0], to: path.slice(1), role, air: seg.air });
    }
  }

  // Beschriftung der Rollen nach dem Ablauf – ohne Überlappung mit Spielern oder anderen Schildern
  const badges: Badge[] = [];
  if (phase === "result" && r && result && opt) {
    const players = Object.values(pos);
    const covers = (at: Pt, text: string) => {
      const hw = badgeWidth(text) / 2 + 2.3;
      return players.some((p) => Math.abs(p[0] - at[0]) < hw && Math.abs(p[1] - at[1]) < 3.9);
    };
    const clash = (at: Pt, text: string) =>
      badges.some((b) => Math.abs(b.at[0] - at[0]) < (badgeWidth(b.text) + badgeWidth(text)) / 2 + 0.6 && Math.abs(b.at[1] - at[1]) < 3.8);
    const add = (i: number | undefined, text: string, cls: string, optional = false) => {
      const seg = i === undefined ? undefined : r.segments.find((s) => s.step === i);
      if (!seg) return;
      const a = seg.ball[0];
      const b = seg.ball[seg.ball.length - 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const n: Pt = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      // Kandidaten entlang des Passes, beidseits versetzt
      const cands: Pt[] = [];
      for (const f of [0.5, 0.35, 0.65, 0.2, 0.8])
        for (const k of [-2.8, 2.8, -5.2, 5.2, -7.6, 7.6]) {
          const m = along(seg.ball, f);
          const at: Pt = [m[0] + n[0] * k, m[1] + n[1] * k];
          const hw = badgeWidth(text) / 2;
          if (inView([at[0] - hw, at[1]], 0.5) && inView([at[0] + hw, at[1]], 0.5) && inView(at, 2)) cands.push(at);
        }
      const free = cands.filter((c) => !clash(c, text));
      const best = free.find((c) => !covers(c, text));
      if (best) badges.push({ at: best, text, cls });
      else if (!optional && free.length) badges.push({ at: free[0], text, cls });
    };
    add(result.pre, "Pre-Assist", "pre");
    add(result.assist, "Assist", "assist");
    if (result.pre !== 0 && result.assist !== 0) add(0, pick(lang, "Dein Pass", "Your pass"), "yours", true);
  }

  const goalScored = phase === "result" && result?.goal;
  const targets = order.map((oi) => optionTarget(scene, scene.options[oi]));
  const spots = letterSpots(
    scene,
    targets.map((x) => x.at),
  );
  const you = pos.you;
  const pickTarget = (id: string) => {
    const n = targets.findIndex((x) => x.who === id);
    return n >= 0 ? order[n] : undefined;
  };

  return (
    <svg
      viewBox={`${vx} ${vy} ${vs} ${vs}`}
      className="pitch pg-pitch"
      role="img"
      aria-label={pick(lang, "Spielfeld mit der Spielsituation", "Pitch showing the situation")}
    >
      <Markings />
      {goalScored && <rect x={120} y={36} width={1.6} height={8} className="pg-net" />}

      {/* Optionen: erst alle Trefferflächen, Pfeile und Buchstaben liegen darüber */}
      {phase === "choose" &&
        order.map((oi, n) => {
          const target = targets[n].at;
          const start = shorten(target, you, 3.2);
          return (
            <line
              key={`hit-${oi}`}
              x1={start[0]}
              y1={start[1]}
              x2={target[0]}
              y2={target[1]}
              className="pg-option-hit"
              onClick={() => onPick(oi)}
              onMouseEnter={() => setHover(oi)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      {phase === "choose" &&
        order.map((oi, n) => {
          const target = targets[n].at;
          const end = shorten(you, target, 2.6);
          return (
            <g key={`arrow-${oi}`} className={`pg-option ${hover === oi ? "is-active" : ""}`} aria-hidden="true">
              <line x1={you[0]} y1={you[1]} x2={end[0]} y2={end[1]} className="pg-option-line" />
              <polygon points={arrowHead(you, end, 2.2, 2)} className="pg-option-head" />
            </g>
          );
        })}

      {trails.map((tr, i) => (
        <polyline
          key={i}
          points={[tr.from, ...tr.to].map((p) => p.join(",")).join(" ")}
          className={`pg-trail is-${tr.role} ${tr.air ? "is-air" : ""}`}
        />
      ))}

      {/* Spieler */}
      {Object.entries(pos).map(([id, p]) => {
        if (id === "you") return null;
        const opp = isOpp(id);
        const oi = phase === "choose" && !opp ? pickTarget(id) : undefined;
        return (
          <g
            key={id}
            transform={`translate(${p[0]} ${p[1]})`}
            className={`pg-player ${opp ? (id === "o0" ? "is-keeper" : "is-opp") : "is-mate"} ${oi !== undefined ? "is-target" : ""}`}
            onClick={oi !== undefined ? () => onPick(oi) : undefined}
            onMouseEnter={oi !== undefined ? () => setHover(oi) : undefined}
            onMouseLeave={oi !== undefined ? () => setHover(null) : undefined}
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
      <g transform={`translate(${you[0]} ${you[1]})`} className="pg-player is-you">
        {phase === "choose" && <circle r={2.4} className="pg-pulse" />}
        <circle r={2.4} />
        <text y={0.6} textAnchor="middle">
          {pick(lang, "DU", "YOU")}
        </text>
      </g>

      {/* Namen über allen Punkten, damit kein Gegner sie verdeckt */}
      <g className="pg-names" aria-hidden="true">
        {Object.entries(pos).map(([id, p]) =>
          !isOpp(id) && names[id] ? (
            <text key={id} x={p[0]} y={p[1] + (id === "you" ? 4.7 : 4.4)} textAnchor="middle" className={`pg-name ${id === "you" ? "is-you" : ""}`}>
              {names[id]}
            </text>
          ) : null,
        )}
      </g>

      {/* Buchstaben ganz oben, damit ein Tipp immer die richtige Option trifft */}
      {phase === "choose" &&
        order.map((oi, n) => (
          <g
            key={`letter-${oi}`}
            transform={`translate(${spots[n][0]} ${spots[n][1]})`}
            className={`pg-letter-group ${hover === oi ? "is-active" : ""}`}
            onClick={() => onPick(oi)}
            onMouseEnter={() => setHover(oi)}
            onMouseLeave={() => setHover(null)}
          >
            <circle r={2.2} className="pg-letter" />
            <text y={0.85} textAnchor="middle" className="pg-letter-text">
              {LETTERS[n]}
            </text>
          </g>
        ))}

      {/* Ball */}
      {phase !== "choose" && (
        <g transform={`translate(${ball[0]} ${ball[1]})`}>
          {lift > 0 && <ellipse cx={0} cy={1.2 + lift * 1.6} rx={0.9} ry={0.35} className="pg-ball-shadow" />}
          <circle r={0.95 + lift * 0.55} cy={-lift * 1.6} className="pg-ball" />
        </g>
      )}

      {/* Ballverlust markieren */}
      {phase === "result" && r && result && !result.goal && <circle cx={r.ballEnd[0]} cy={r.ballEnd[1]} r={3.4} className="pg-lost" />}

      {badges.map((b, i) => (
        <g key={i} transform={`translate(${b.at[0]} ${b.at[1]})`} className={`pg-badge is-${b.cls}`}>
          <rect x={-badgeWidth(b.text) / 2} y={-1.9} width={badgeWidth(b.text)} height={3.2} rx={1.2} />
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
  const [phase, setPhase] = useState<Phase>("choose");
  const [shown, setShown] = useState<number | null>(null); // gerade gezeigte Option
  const [choice, setChoice] = useState<number | null>(null); // gewertete Wahl
  const [revealed, setRevealed] = useState(false); // eigene Wahl fertig abgespielt
  const [hover, setHover] = useState<number | null>(null);
  const [played, setPlayed] = useState<Played[]>([]);
  const [best, setBest] = useState(0);
  const [t, setT] = useState(0);
  const [over, setOver] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [index, setIndex] = useState<SceneIndex[] | null>(null);
  const [filter, setFilter] = useState(ALL);
  const [failed, setFailed] = useState(false);
  const raf = useRef(0);
  const focusChoices = useRef(false);
  const questionRef = useRef<HTMLParagraphElement>(null);
  // Hervorhebung erst nach echter Mausbewegung – sonst wirkt die Option unter dem Zeiger wie vorgewählt
  const moved = useRef(false);
  const hoverIf = useCallback((oi: number | null) => {
    if (oi === null || moved.current) setHover(oi);
  }, []);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const finalRef = useRef<HTMLHeadingElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last: [number, number] | null = null;
    const onMove = (e: PointerEvent) => {
      if (last && Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 3) moved.current = true;
      last = [e.clientX, e.clientY];
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  useEffect(() => {
    if (phase === "choose") {
      moved.current = false;
      setHover(null);
    }
  }, [phase, idx]);

  // Szenen-Übersicht laden; Zufall erst im Browser – sonst passt das vorgerenderte HTML nicht
  useEffect(() => {
    setBest(loadBestScore());
    fetch("/daten/szenen/index.json")
      .then((r) => r.json() as Promise<SceneIndex[]>)
      .then(async (list) => {
        setIndex(list);
        setDeck(await newDeck(list, ALL));
      })
      .catch(() => setFailed(true));
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const round = deck?.[idx] ?? null;
  const scene = round?.scene ?? null;
  const view = useMemo(() => (scene ? sceneView(scene) : ([38.5, -4, 88] as [number, number, number])), [scene]);
  const r = useMemo(() => (scene && shown !== null ? run(scene, scene.options[shown]) : null), [scene, shown]);
  const result = useMemo(() => (scene && shown !== null ? classify(scene, scene.options[shown]) : null), [scene, shown]);
  const score = played.reduce((a, p) => a + p.points, 0);
  const isLast = deck !== null && idx === deck.length - 1;
  const isReplay = shown !== null && shown !== choice;

  const animate = useCallback((total: number) => {
    cancelAnimationFrame(raf.current);
    if (reducedMotion()) {
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
      if (!scene || phase === "play") return;
      setShown(oi);
      setPhase("play");
      setAnnounce("");
      animate(run(scene, scene.options[oi]).total);
      // Am Handy liegt das Spielfeld oft außerhalb des Bildschirms – erst nach dem Neuzeichnen hinscrollen
      requestAnimationFrame(() => {
        const box = fieldRef.current?.getBoundingClientRect();
        if (box && (box.top < 56 || box.bottom > window.innerHeight))
          fieldRef.current?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
      });
    },
    [scene, phase, animate],
  );

  const pickOption = useCallback(
    (oi: number) => {
      if (!scene || phase !== "choose") return;
      setChoice(oi);
      setHover(null);
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

  // Ergebnis: Punkte erst zählen, wenn die eigene Wahl fertig abgespielt ist
  useEffect(() => {
    if (phase !== "result" || !scene || shown === null || !result) return;
    const v = VERDICT[result.outcome];
    const own = shown === choice;
    if (own && !revealed) {
      setRevealed(true);
      setPlayed((p) => [...p, { scene, choice: shown, outcome: result.outcome, points: POINTS[result.outcome] }]);
    }
    const pts = own ? pick(lang, `, plus ${POINTS[result.outcome]} Punkte`, `, plus ${POINTS[result.outcome]} points`) : "";
    const prefix = own ? "" : `${pick(lang, "Option", "Option")} ${LETTERS[round?.order.indexOf(shown) ?? 0]}: `;
    setAnnounce(`${prefix}${v[lang]}${pts}. ${scene.options[shown].explain[lang]}`);
    resultRef.current?.focus({ preventScroll: true });
  }, [phase, shown]); // bewusst nur bei neuem Ergebnis

  // Beim Abspielen den Fokus auf „Überspringen“, damit er nicht verloren geht
  useEffect(() => {
    if (phase === "play") skipRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // Nach „Weiter“ und „Nochmal“ steht der Fokus auf der Frage – ohne eine Option vorzuwählen
  useEffect(() => {
    if (phase === "choose" && focusChoices.current) {
      focusChoices.current = false;
      questionRef.current?.focus({ preventScroll: true });
    }
  }, [phase, idx, deck]);

  const toTop = () => {
    const top = boxRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 64) boxRef.current?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const reset = () => {
    cancelAnimationFrame(raf.current);
    setPhase("choose");
    setShown(null);
    setChoice(null);
    setRevealed(false);
    setT(0);
    setAnnounce("");
    focusChoices.current = true;
  };

  const next = () => {
    if (!deck) return;
    reset();
    setIdx((i) => i + 1);
    toTop();
  };

  const finish = () => {
    // Bestwert gegen den gespeicherten Stand prüfen – ein anderer Tab könnte ihn erhöht haben
    const stored = loadBestScore();
    if (score > stored) storeBestScore(score);
    setBest(Math.max(stored, score));
    setOver(true);
    setAnnounce(pick(lang, `Runde beendet: ${score} von ${ROUND * POINTS.pre} Punkten.`, `Round over: ${score} of ${ROUND * POINTS.pre} points.`));
  };

  // Auswertung ins Bild holen und fokussieren
  useEffect(() => {
    if (!over) return;
    finalRef.current?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    finalRef.current?.focus({ preventScroll: true });
  }, [over]);

  const restart = async (nextFilter = filter) => {
    if (!index) return;
    reset();
    setFilter(nextFilter);
    setDeck(null);
    setIdx(0);
    setPlayed([]);
    setOver(false);
    try {
      setDeck(await newDeck(index, nextFilter));
    } catch {
      setFailed(true);
    }
    toTop();
  };

  if (failed)
    return (
      <p className="empty">
        {pick(lang, "Die Spielszenen konnten nicht geladen werden. Bitte lade die Seite neu.", "The situations could not be loaded. Please reload the page.")}
      </p>
    );
  if (!deck || !scene || !round) return <LogoLoader label={pick(lang, "Lade echte Spielszenen …", "Loading real situations …")} />;

  const verdict = result ? VERDICT[result.outcome] : null;
  const letterOf = (oi: number) => LETTERS[round.order.indexOf(oi)];
  const max = deck.length * POINTS.pre;

  return (
    <div className="pg" ref={boxRef}>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {index && (
        <label className="pg-filter">
          <span>{pick(lang, "Bewerb", "Competition")}</span>
          <select value={filter} onChange={(e) => restart(e.target.value)}>
            <option value={ALL}>
              {pick(lang, "Alle Bewerbe", "All competitions")} ({index.reduce((a, s) => a + s.count, 0)})
            </option>
            {index.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name[lang]} ({s.count})
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="game-score pg-score">
        <span>
          {pick(lang, "Situation", "Situation")}{" "}
          <b>
            {Math.min(idx + 1, deck.length)}/{deck.length}
          </b>
        </span>
        <span>
          {pick(lang, "Punkte", "Points")} <b>{score}</b>
        </span>
        <span>
          {pick(lang, "Rekord", "Best")} <b>{best}</b>
        </span>
      </div>

      <div className="pg-layout">
        <div className="pg-intro">
          <span className="league-kicker">{sceneTitle(scene, lang)}</span>
          <p className="pg-setup">{scene.setup[lang]}</p>
        </div>

        <div className="pg-field" ref={fieldRef}>
          <PassPitch
            scene={scene}
            view={view}
            lang={lang}
            order={round.order}
            phase={phase}
            hover={hover}
            setHover={hoverIf}
            onPick={pickOption}
            r={r}
            result={result}
            shown={shown}
            t={t}
          />
          {phase === "result" && verdict && result && shown !== null && (
            <div key={`${idx}-${shown}`} className={`pg-flash is-${verdict.tone}`} aria-hidden="true">
              {isReplay && <small>{letterOf(shown)}:</small>}
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
          {phase === "choose" && (
            <>
              <p className="pg-question" ref={questionRef} tabIndex={-1}>
                {pick(lang, "Welcher Pass wird zum Pre-Assist?", "Which pass becomes the pre-assist?")}
              </p>
              <div className="pg-options" ref={choicesRef}>
                {round.order.map((oi, n) => (
                  <button
                    key={oi}
                    type="button"
                    className={`pg-choice ${hover === oi ? "is-active" : ""}`}
                    onClick={() => pickOption(oi)}
                    onMouseEnter={() => hoverIf(oi)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHover(oi)}
                    onBlur={() => setHover(null)}
                  >
                    <span className="pg-choice-letter" aria-hidden="true">
                      {LETTERS[n]}
                    </span>
                    <span className="sr-only">{LETTERS[n]}: </span>
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
              <button ref={skipRef} type="button" className="btn btn-ghost btn-small" onClick={skip}>
                {pick(lang, "Überspringen", "Skip")}
              </button>
            </div>
          )}

          {phase === "result" && verdict && result && shown !== null && (
            <div ref={resultRef} tabIndex={-1} className={`pg-result is-${verdict.tone}`}>
              {scene.meta && (
                <span className={`pg-tag ${scene.options[shown].real ? "is-real" : ""}`}>
                  {scene.options[shown].real ? pick(lang, "So lief es wirklich", "What really happened") : pick(lang, "Was wäre wenn", "What if")}
                </span>
              )}
              <p className="pg-verdict">
                {isReplay && <small>{pick(lang, `Option ${letterOf(shown)}:`, `Option ${letterOf(shown)}:`)} </small>}
                {verdict[lang]}
                {!isReplay && <span className="pg-points">+{POINTS[result.outcome]}</span>}
              </p>
              <p>{scene.options[shown].explain[lang]}</p>
            </div>
          )}

          {phase === "result" && revealed && !over && (
            <button type="button" className="btn pg-next" onClick={isLast ? finish : next}>
              {isLast ? pick(lang, "Auswertung ansehen", "See your score") : pick(lang, "Nächste Situation", "Next situation")} ›
            </button>
          )}

          {revealed && (
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
                        aria-disabled={phase === "play"}
                        aria-pressed={shown === oi}
                      >
                        <span className="pg-choice-letter" aria-hidden="true">
                          {letterOf(oi)}
                        </span>
                        <span className="pg-other-label">
                          <span className="sr-only">{letterOf(oi)}: </span>
                          {scene.options[oi].label[lang]}
                        </span>
                        <span className="pg-other-verdict">
                          {VERDICT[o][lang]}
                          {scene.options[oi].real && <em>{pick(lang, " · so war's", " · real")}</em>}
                          {oi === choice && <em>{pick(lang, " · deine Wahl", " · your pick")}</em>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {over && (
        <div className="pg-final">
          <h2 ref={finalRef} tabIndex={-1}>
            {score} / {max} {pick(lang, "Punkte", "points")}
          </h2>
          <p>{rating(score, max, lang)}</p>
          <ol className="pg-final-list">
            {played.map((p, i) => (
              <li key={i} className={`is-${VERDICT[p.outcome].tone}`}>
                <span>
                  {sceneTitle(p.scene, lang)}
                  {p.scene.meta && <small> · {p.scene.meta.minute}</small>}
                </span>
                <span>
                  {VERDICT[p.outcome][lang]} · +{p.points}
                </span>
              </li>
            ))}
          </ol>
          <div className="player-actions">
            <button type="button" className="btn" onClick={() => restart()}>
              {pick(lang, "Nochmal spielen", "Play again")}
            </button>
            <ShareResult played={played} score={score} max={max} lang={lang} />
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
