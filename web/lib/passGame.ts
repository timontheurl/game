// Spiel „Finde den Pre-Assist“: Szenen, Ablauf und Auswertung.
// Ohne Importe, damit auch das Prüfskript (scripts/check-scenes.mts) die Datei direkt mit Node laden kann.
//
// Koordinaten wie StatsBomb: x 0–120 (Angriff nach rechts, Tor bei x = 120), y 0–80.
// Die Szenen sind echte Tore aus den StatsBomb-Daten (pipeline/build_scenes.py).

export type Pt = [number, number];
export type Text = { de: string; en: string };

/** "you" = du, sonst Rückennummer eines Mitspielers ("9") oder Gegner "o0", "o1" … (o0 = Torwart). */
export type Actor = string;

export type ShotResult = "goal" | "saved" | "blocked" | "wide" | "post";

export type Step =
  /**
   * Pass. `at`: Zielpunkt, zu dem der Empfänger läuft. `air`: hoher Ball.
   * Geht er an einen Gegner ("o3"), ist das ein Ballverlust; `aim` ist dann der gemeinte Mitspieler.
   */
  | { k: "pass"; from: Actor; to: Actor; at?: Pt; air?: boolean; aim?: Actor }
  /** Dribbling des Ballführenden bis `to`. */
  | { k: "carry"; who: Actor; to: Pt }
  /** Schuss auf `to`. `by`: Gegner, der hält oder blockt (läuft zum Ball). */
  | { k: "shot"; who: Actor; to: Pt; result: ShotResult; by?: number; air?: boolean }
  /** Freier Ball (Abpraller, abgefälschter Ball) – kein Pass. `off`: Gegner, von dem der Ball abprallt. */
  | { k: "loose"; to: Actor; at: Pt; off?: number }
  /** Foul an `on` durch Gegner `by` im Strafraum → Elfmeter, den `on` schießt. */
  | { k: "foul"; on: Actor; by: number; result: "goal" | "saved" };

export interface Option {
  label: Text; // kurz, z. B. „Steil auf Giroud“
  steps: Step[]; // erster Schritt ist immer dein Pass
  expect: Outcome; // was die Auswertung ergeben muss (vom Prüfskript kontrolliert)
  explain: Text; // Auflösung nach dem Abspielen
  /** So ist es wirklich passiert – alle anderen Optionen sind „Was wäre wenn“ */
  real?: boolean;
}

/** Spiel, aus dem eine echte Szene stammt */
export interface SceneMeta {
  competition: Text;
  home: string;
  away: string;
  /** Flaggen-Codes bei Nationalteams – die Seite zeigt daraus den Ländernamen in ihrer Sprache */
  homeCode?: string;
  awayCode?: string;
  date: string;
  minute: string; // wie auf der Website: 38', 45+2'
  team: string; // angreifendes Team
  score: [number, number]; // Stand vor dem Tor (Heim:Gast)
  final: [number, number];
}

export interface Scene {
  id: string;
  title: Text;
  setup: Text; // Lage in ein, zwei Sätzen
  /** Standardsituation, die du ausführst – bei Ecke und Einwurf gibt es beim ersten Pass kein Abseits */
  restart?: "corner" | "throw-in" | "free-kick";
  you: Pt;
  mates: Record<string, Pt>; // Rückennummer → Position
  opps: Pt[]; // Index 0 = Torwart
  options: Option[]; // 3–4, genau eine ergibt einen Pre-Assist
  /** Kurznamen der Spieler: "you", Rückennummern der Mitspieler */
  names?: Record<string, string>;
  meta?: SceneMeta;
}

export type Outcome =
  | "pre" // dein Pass ist der Pre-Assist
  | "assist" // dein Pass ist schon die Vorlage
  | "early" // Tor, aber dein Pass kam noch vor dem Pre-Assist
  | "nocount" // Tor, aber ohne Assist oder mit Unterbrechung – dein Pass zählt nicht
  | "lost" // Fehlpass: dein Pass landet beim Gegner
  | "nogoal"; // kein Tor

export const POINTS: Record<Outcome, number> = { pre: 3, assist: 1, early: 0, nocount: 0, lost: 0, nogoal: 0 };

export const PENALTY_SPOT: Pt = [108, 40];
export const isOpp = (a: Actor) => /^o\d+$/.test(a);
const oppId = (n: number) => `o${n}`;

export interface Result {
  outcome: Outcome;
  goal: boolean;
  /** Index des Schritts mit der Vorlage bzw. dem Pre-Assist, falls es sie gibt */
  assist?: number;
  pre?: number;
  /** Pässe der gezählten Kette vor dem Pre-Assist („Pass davor“) */
  before: number[];
}

/**
 * Wertet einen Ablauf nach den Regeln der Methodik aus:
 * Assist = letzter Pass zum Torschützen, Pre-Assist = Pass zum Vorlagengeber davor.
 * Zwischen den Pässen darf nur der jeweilige Empfänger dribbeln; Abpraller, Fouls,
 * Ballverluste und Schüsse ohne Tor unterbrechen die Kette. Elfmeter haben keinen Assist.
 */
export function classify(scene: Scene, option: Option): Result {
  const steps = option.steps;
  // Gezählte Kette: Indizes vollständiger Pässe seit der letzten Unterbrechung
  let chain: number[] = [];
  // Wer seit dem letzten Pass am Ball ist und ob seitdem nur er gedribbelt hat
  let lastReceiver: Actor | null = "you";
  let clean = true;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.k === "pass") {
      if (isOpp(s.to)) {
        return { outcome: i === 0 ? "lost" : "nogoal", goal: false, before: [] };
      }
      if (!clean || s.from !== lastReceiver) chain = [];
      chain.push(i);
      lastReceiver = s.to;
      clean = true;
    } else if (s.k === "carry") {
      if (s.who !== lastReceiver) clean = false;
    } else if (s.k === "loose") {
      chain = [];
      lastReceiver = s.to;
      clean = false; // ein freier Ball ist kein Pass – danach beginnt eine neue Kette
      if (isOpp(s.to)) return { outcome: "nogoal", goal: false, before: [] };
    } else if (s.k === "foul") {
      if (s.result === "goal") return { outcome: "nocount", goal: true, before: [] };
      return { outcome: "nogoal", goal: false, before: [] };
    } else if (s.k === "shot") {
      if (s.result !== "goal") {
        chain = [];
        clean = false;
        lastReceiver = null;
        continue;
      }
      // Tor: Vorlage nur, wenn der letzte Pass beim Schützen ankam und nur er seitdem dribbelte
      const a = chain.length && clean && lastReceiver === s.who ? chain[chain.length - 1] : undefined;
      if (a === undefined) return { outcome: "nocount", goal: true, before: [] };
      const assistPass = steps[a] as Extract<Step, { k: "pass" }>;
      const p = chain.length > 1 ? chain[chain.length - 2] : undefined;
      const prePass = p !== undefined ? (steps[p] as Extract<Step, { k: "pass" }>) : undefined;
      const pre = prePass && prePass.to === assistPass.from ? p : undefined;
      const before = pre !== undefined ? chain.slice(0, chain.indexOf(pre)) : [];
      const outcome: Outcome = pre === 0 ? "pre" : a === 0 ? "assist" : before.includes(0) ? "early" : "nocount";
      return { outcome, goal: true, assist: a, pre, before };
    }
  }
  return { outcome: "nogoal", goal: false, before: [] };
}

/** Wohin die Option zielt (für die Pfeile vor der Entscheidung): gemeinter Mitspieler bzw. Zielpunkt. */
export function optionTarget(scene: Scene, option: Option): { who: Actor; at: Pt } {
  const first = option.steps[0] as Extract<Step, { k: "pass" }>;
  const pos = startPositions(scene);
  if (isOpp(first.to) && first.aim) return { who: first.aim, at: pos[first.aim] };
  return { who: first.to, at: first.at ?? pos[first.to] };
}

/** Ausschnitt des Spielfelds: [x, y, Kantenlänge] des quadratischen viewBox */
export type View = [number, number, number];

/**
 * Ausschnitt je Szene: alles, was in irgendeiner Option passiert, plus Tor – quadratisch und
 * mit etwas Rand. So ist das Geschehen am Handy deutlich größer als mit der ganzen Hälfte.
 * Dazu jedes Ziel der Pfeile samt Platz für den Namen darunter, auch bei Fehlpässen.
 */
export function sceneView(scene: Scene): View {
  const pts: Pt[] = [scene.you, [scene.you[0], scene.you[1] + 5], [121.6, 36], [121.6, 44]];
  for (const o of scene.options) {
    const r = run(scene, o);
    for (const seg of r.segments) {
      pts.push(...seg.ball);
      for (const m of seg.movers) pts.push(m.to);
    }
    const at = optionTarget(scene, o).at;
    pts.push(at, [at[0], at[1] + 6]);
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

/** Liegt p mit Rand m im Ausschnitt? */
export const inView = (v: View, p: Pt, m = 0) => p[0] >= v[0] + m && p[0] <= v[0] + v[2] - m && p[1] >= v[1] + m && p[1] <= v[1] + v[2] - m;

// ---------- Ablauf für Animation und Prüfung ----------

export interface Segment {
  step: number;
  t0: number;
  t1: number;
  /** Ballweg; bei abgefälschten Bällen mit Zwischenpunkt */
  ball: Pt[];
  air: boolean;
  movers: { id: Actor; from: Pt; to: Pt }[];
}

export interface Run {
  segments: Segment[];
  total: number;
  /** Positionen aller Spieler vor jedem Schritt (für das Prüfskript) */
  before: Record<Actor, Pt>[];
  /** Positionen am Ende */
  end: Record<Actor, Pt>;
  ballEnd: Pt;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const lerp = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

export function startPositions(scene: Scene): Record<Actor, Pt> {
  const pos: Record<Actor, Pt> = { you: scene.you };
  for (const [id, p] of Object.entries(scene.mates)) pos[id] = p;
  scene.opps.forEach((p, i) => (pos[oppId(i)] = p));
  return pos;
}

/** Baut die Zeitleiste: Pässe schnell, Dribblings langsamer, kurze Pausen dazwischen. */
export function run(scene: Scene, option: Option): Run {
  const pos = startPositions(scene);
  const segments: Segment[] = [];
  const before: Record<Actor, Pt>[] = [];
  let ball: Pt = scene.you;
  let t = 0.2;

  const add = (step: number, path: Pt[], dur: number, movers: Segment["movers"], air = false, pause = 0.16) => {
    segments.push({ step, t0: t, t1: t + dur, ball: path, air, movers });
    for (const m of movers) pos[m.id] = m.to;
    ball = path[path.length - 1];
    t += dur + pause;
  };

  option.steps.forEach((s, i) => {
    before.push({ ...pos });
    if (s.k === "pass") {
      const target = s.at ?? pos[s.to];
      const len = dist(ball, target);
      add(i, [ball, target], Math.max(0.4, len / (s.air ? 34 : 42)), [{ id: s.to, from: pos[s.to], to: target }], !!s.air);
    } else if (s.k === "carry") {
      add(i, [ball, s.to], Math.max(0.35, dist(ball, s.to) / 14), [{ id: s.who, from: pos[s.who], to: s.to }], false, 0.06);
    } else if (s.k === "shot") {
      const movers = s.by !== undefined ? [{ id: oppId(s.by), from: pos[oppId(s.by)], to: s.to }] : [];
      add(i, [ball, s.to], 0.38, movers, !!s.air, 0.3);
    } else if (s.k === "loose") {
      const path: Pt[] = s.off !== undefined ? [ball, pos[oppId(s.off)], s.at] : [ball, s.at];
      add(i, path, 0.45, [{ id: s.to, from: pos[s.to], to: s.at }], false, 0.12);
    } else if (s.k === "foul") {
      // Gegner geht dazwischen, dann Elfmeter: Schütze zum Punkt, Schuss
      const victim = pos[s.on];
      add(i, [ball, ball], 0.4, [{ id: oppId(s.by), from: pos[oppId(s.by)], to: [victim[0] - 1.2, victim[1] + 1.2] }], false, 0.5);
      add(i, [ball, PENALTY_SPOT], 0.5, [{ id: s.on, from: pos[s.on], to: [PENALTY_SPOT[0] - 2.5, PENALTY_SPOT[1]] }], false, 0.4);
      const target: Pt = s.result === "goal" ? [120, 37.6] : [119, 38.5];
      const keeper = s.result === "saved" ? [{ id: "o0", from: pos.o0, to: target }] : [];
      add(i, [PENALTY_SPOT, target], 0.35, keeper, false, 0.3);
    }
  });

  return { segments, total: t, before, end: { ...pos }, ballEnd: ball };
}

/** Szene gespiegelt (oben ↔ unten). Echte Szenen (mit `meta`) bleiben, wie sie waren. */
export function mirror(scene: Scene): Scene {
  if (scene.meta) return scene;
  const m = (p: Pt): Pt => [p[0], 80 - p[1]];
  const step = (s: Step): Step => {
    switch (s.k) {
      case "pass":
        return s.at ? { ...s, at: m(s.at) } : s;
      case "carry":
        return { ...s, to: m(s.to) };
      case "shot":
        return { ...s, to: m(s.to) };
      case "loose":
        return { ...s, at: m(s.at) };
      default:
        return s;
    }
  };
  return {
    ...scene,
    id: `${scene.id}~m`,
    you: m(scene.you),
    mates: Object.fromEntries(Object.entries(scene.mates).map(([k, p]) => [k, m(p)])),
    opps: scene.opps.map(m),
    options: scene.options.map((o) => ({ ...o, steps: o.steps.map(step) })),
  };
}
