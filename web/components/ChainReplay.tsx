"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrowHead, type Pt } from "@/lib/geom";
import type { Goal } from "@/lib/data";
import { t as tr, type Lang } from "@/lib/i18n";

type Kind = "pre" | "assist" | "shot" | "carry";
interface Segment {
  kind: Kind;
  from: Pt;
  to: Pt;
  start: number;
  dur: number;
}

const lerp = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Baut die Abschnitte des Spielzugs mit Startzeit und Dauer (Pässe schnell, Dribblings langsamer). */
function buildSegments(goal: Goal): Segment[] {
  const raw: Omit<Segment, "start" | "dur">[] = [];
  if (goal.pre) raw.push({ kind: "pre", from: goal.pre.start, to: goal.pre.end });
  if (goal.pre && goal.assist) raw.push({ kind: "carry", from: goal.pre.end, to: goal.assist.start });
  if (goal.assist) raw.push({ kind: "assist", from: goal.assist.start, to: goal.assist.end });
  if (goal.assist) raw.push({ kind: "carry", from: goal.assist.end, to: goal.shot.start });
  raw.push({ kind: "shot", from: goal.shot.start, to: goal.shot.end ?? [120, 40] });

  let t = 0.35;
  return raw
    .filter((s) => s.kind !== "carry" || dist(s.from, s.to) > 0.8)
    .map((s) => {
      const len = dist(s.from, s.to);
      const dur = s.kind === "carry" ? Math.max(0.25, len / 16) : s.kind === "shot" ? 0.35 : Math.max(0.35, len / 48);
      const seg = { ...s, start: t, dur };
      t += dur + (s.kind === "carry" ? 0.05 : 0.18);
      return seg;
    });
}

export default function ChainReplay({
  goal,
  names,
  lang = "de",
}: {
  goal: Goal;
  names: Record<string, string>;
  lang?: Lang;
}) {
  const segments = useMemo(() => buildSegments(goal), [goal]);
  const total = segments.length ? segments[segments.length - 1].start + segments[segments.length - 1].dur + 0.2 : 0;
  const [t, setT] = useState(total);
  const [speed, setSpeed] = useState(1);
  const raf = useRef(0);

  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(total);
      return;
    }
    let last = performance.now();
    let cur = 0;
    setT(0);
    const tick = (now: number) => {
      cur += ((now - last) / 1000) * speed;
      last = now;
      setT(Math.min(cur, total));
      if (cur < total) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [total, speed]);

  // Bei jedem neuen Tor automatisch abspielen
  useEffect(() => {
    play();
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  let ball: Pt = segments[0]?.from ?? goal.shot.start;
  for (const s of segments) {
    if (t >= s.start) ball = lerp(s.from, s.to, Math.min(1, (t - s.start) / s.dur));
  }

  const labels: { at: Pt; text: string; kind: Kind; show: boolean }[] = [];
  if (goal.pre) labels.push({ at: goal.pre.start, text: names[String(goal.pre.player)], kind: "pre", show: true });
  if (goal.assist) {
    const s = segments.find((x) => x.kind === "assist");
    labels.push({ at: goal.assist.start, text: names[String(goal.assist.player)], kind: "assist", show: !!s && t >= s.start - 0.3 });
  }
  const shotSeg = segments.find((x) => x.kind === "shot");
  labels.push({ at: goal.shot.start, text: names[String(goal.scorer)], kind: "shot", show: !!shotSeg && t >= shotSeg.start - 0.3 });
  const scored = shotSeg ? t >= shotSeg.start + shotSeg.dur : true;

  return (
    <div className="replay">
      <svg viewBox="-2 -4 124 88" className="pitch replay-pitch" role="img" aria-label={tr(lang, "chain.replayLabel")}>
        <g className="pitch-markings">
          <rect x={0} y={0} width={120} height={80} />
          <line x1={60} y1={0} x2={60} y2={80} />
          <circle cx={60} cy={40} r={10} />
          <rect x={102} y={18} width={18} height={44} />
          <rect x={114} y={30} width={6} height={20} />
          <rect x={0} y={18} width={18} height={44} />
          <rect x={0} y={30} width={6} height={20} />
          <circle cx={108} cy={40} r={0.4} className="spot" />
          <path d="M 102 32.7 A 10 10 0 0 0 102 47.3" />
        </g>
        <rect x={120} y={36} width={1.8} height={8} className={`replay-goal ${scored ? "is-scored" : ""}`} />

        {segments.map((s, i) => {
          if (t < s.start) return null;
          const f = Math.min(1, (t - s.start) / s.dur);
          const end = lerp(s.from, s.to, f);
          if (s.kind === "carry") {
            return <line key={i} x1={s.from[0]} y1={s.from[1]} x2={end[0]} y2={end[1]} className="pitch-carry" />;
          }
          return (
            <g key={i} className={`pitch-arrow ${s.kind}`}>
              <line x1={s.from[0]} y1={s.from[1]} x2={end[0]} y2={end[1]} className="pitch-line" />
              {f === 1 && <polygon points={arrowHead(s.from, s.to, 3, 2.6)} className="pitch-head" />}
            </g>
          );
        })}

        {labels.map(
          (l) =>
            l.show && (
              <g key={l.kind} className={`replay-label ${l.kind}`}>
                <circle cx={l.at[0]} cy={l.at[1]} r={1.6} />
                <text x={Math.min(108, Math.max(12, l.at[0]))} y={l.at[1] < 6 ? l.at[1] + 5 : l.at[1] - 3} textAnchor="middle">
                  {l.text}
                </text>
              </g>
            ),
        )}

        <circle cx={ball[0]} cy={ball[1]} r={1.3} className="replay-ball" />
      </svg>
      <div className="replay-controls">
        <button type="button" className="btn btn-small" onClick={play}>
          {tr(lang, "chain.replay")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
          aria-pressed={speed === 0.5}
        >
          {tr(lang, speed === 1 ? "chain.slow" : "chain.normal")}
        </button>
      </div>
    </div>
  );
}
