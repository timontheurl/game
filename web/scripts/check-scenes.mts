// Prüft die Szenen des Spiels „Finde den Pre-Assist“ (lib/scenes/*.json).
//   node --experimental-strip-types scripts/check-scenes.mts            → Fehler und Warnungen
//   node --experimental-strip-types scripts/check-scenes.mts --html x.html [datei.json …]
//                                                                    → zusätzlich Vorschau aller Abläufe
// Läuft auch in der CI; jeder Fehler bricht den Build ab.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, isOpp, letterSpots, mirror, optionTarget, run, startPositions } from "../lib/passGame.ts";
import type { Actor, Option, Outcome, Pt, Scene, Step } from "../lib/passGame.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "lib", "scenes");
const args = process.argv.slice(2);
const htmlAt = args.indexOf("--html");
const htmlOut = htmlAt >= 0 ? args[htmlAt + 1] : null;
const only = args.filter((a, i) => a.endsWith(".json") && (htmlAt < 0 || i !== htmlAt + 1));
const files = (only.length ? only.map((f) => f.split("/").pop()!) : readdirSync(dir).filter((f) => f.endsWith(".json"))).sort();

const errors: string[] = [];
const warnings: string[] = [];
const all: { file: string; scene: Scene }[] = [];

const d = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** Abstand von p zur Strecke a–b, nur im Inneren (Endpunkte ausgenommen) */
function laneDist(p: Pt, a: Pt, b: Pt, from = 0.12, to = 0.88) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy || 1;
  const t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
  if (t < from || t > to) return Infinity;
  return Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]);
}
const inPitch = (p: Pt) => Array.isArray(p) && p.length === 2 && p[0] >= 40 && p[0] <= 120 && p[1] >= 0 && p[1] <= 80;
const SIDE =
  /\b(links|rechts|linke[nmrs]?|rechte[nmrs]?|left-footed|right-footed|left-back|right-back)\b|\b(left|right)[- ](wing|side|flank|back|foot|winger|channel|post|corner|half-space)|\b(on|to|from|down) the (left|right)\b/i;
const OUTCOMES: Outcome[] = ["pre", "assist", "early", "nocount", "lost", "nogoal"];

for (const file of files) {
  let scenes: Scene[];
  try {
    scenes = JSON.parse(readFileSync(join(dir, file), "utf8"));
  } catch (e) {
    errors.push(`${file}: kein gültiges JSON (${(e as Error).message})`);
    continue;
  }
  if (!Array.isArray(scenes)) {
    errors.push(`${file}: muss ein Array von Szenen sein`);
    continue;
  }
  for (const scene of scenes) {
    all.push({ file, scene });
    checkScene(file, scene);
  }
}

// Jede Szenendatei muss im Spiel eingebunden sein (lib/scenes/index.ts)
if (!only.length) {
  const idx = readFileSync(join(dir, "index.ts"), "utf8");
  const registered = new Set([...idx.matchAll(/from "\.\/([\w-]+\.json)"/g)].map((m) => m[1]));
  for (const f of files) if (!registered.has(f)) errors.push(`${f}: nicht in lib/scenes/index.ts eingetragen – die Szenen kämen nie ins Spiel`);
}

// IDs über alle Dateien eindeutig
const ids = new Map<string, string>();
for (const { file, scene } of all) {
  if (ids.has(scene.id)) errors.push(`${file}/${scene.id}: ID schon in ${ids.get(scene.id)} vergeben`);
  ids.set(scene.id, file);
}

function text(where: string, t: unknown, max: number) {
  const v = t as { de?: string; en?: string };
  for (const lang of ["de", "en"] as const) {
    const s = v?.[lang];
    if (typeof s !== "string" || !s.trim()) errors.push(`${where}: Text (${lang}) fehlt`);
    else {
      if (s.length > max) errors.push(`${where}: Text (${lang}) zu lang (${s.length} > ${max})`);
      // Szenen werden gespiegelt – Seitenangaben würden dann nicht mehr stimmen
      if (SIDE.test(s)) errors.push(`${where}: keine Seitenangaben (links/rechts) – Szenen werden gespiegelt: „${s}“`);
    }
  }
}

function checkScene(file: string, s: Scene) {
  const w = `${file}/${s.id ?? "?"}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id ?? "")) errors.push(`${w}: ID nur aus Kleinbuchstaben, Ziffern und Bindestrichen`);
  text(`${w} title`, s.title, 40);
  text(`${w} setup`, s.setup, 190);
  if (s.restart !== undefined && !["corner", "throw-in", "free-kick"].includes(s.restart))
    errors.push(`${w}: restart muss corner, throw-in oder free-kick sein`);
  if (!inPitch(s.you)) errors.push(`${w}: „you“ außerhalb der gezeigten Hälfte (x 40–120, y 0–80)`);
  const mates = Object.entries(s.mates ?? {});
  if (mates.length < 3 || mates.length > 8) errors.push(`${w}: 3–8 Mitspieler erwartet (${mates.length})`);
  for (const [id, p] of mates) {
    if (!/^\d{1,2}$/.test(id)) errors.push(`${w}: Mitspieler-ID „${id}“ muss eine Rückennummer sein`);
    if (!inPitch(p)) errors.push(`${w}: Mitspieler ${id} außerhalb der gezeigten Hälfte`);
  }
  if (!Array.isArray(s.opps) || s.opps.length < 3 || s.opps.length > 9) errors.push(`${w}: 3–9 Gegner erwartet`);
  s.opps?.forEach((p, i) => !inPitch(p) && errors.push(`${w}: Gegner o${i} außerhalb der gezeigten Hälfte`));
  const gk = s.opps?.[0];
  if (gk && !(gk[0] >= 110 && gk[1] >= 30 && gk[1] <= 50)) errors.push(`${w}: o0 ist der Torwart und steht nahe am Tor (x ≥ 110, y 30–50)`);

  // Niemand steht auf jemand anderem
  const start = startPositions(s);
  const actors = Object.keys(start);
  for (let i = 0; i < actors.length; i++)
    for (let j = i + 1; j < actors.length; j++) {
      const gap = d(start[actors[i]], start[actors[j]]);
      if (gap < 3) errors.push(`${w}: ${actors[i]} und ${actors[j]} stehen zu nah (${gap.toFixed(1)} < 3)`);
    }

  if (!Array.isArray(s.options) || s.options.length < 3 || s.options.length > 4) {
    errors.push(`${w}: 3–4 Optionen erwartet`);
    return;
  }
  const outcomes: (Outcome | null)[] = [];
  const firstTargets = new Set<string>();
  let broken = false;
  s.options.forEach((o, i) => {
    const ow = `${w} Option ${String.fromCharCode(65 + i)}`;
    text(`${ow} label`, o.label, 34);
    text(`${ow} explain`, o.explain, 240);
    if (!OUTCOMES.includes(o.expect)) errors.push(`${ow}: expect muss eins von ${OUTCOMES.join(", ")} sein`);
    if (!checkSteps(ow, s, o)) {
      // Fehlerhafte Option: Folgeprüfungen würden nur abstürzen
      broken = true;
      outcomes.push(null);
      return;
    }
    const target = optionTarget(s, o);
    if (firstTargets.has(target.who)) errors.push(`${ow}: zwei Optionen zielen auf denselben Mitspieler (${target.who}) – im Spielfeld nicht unterscheidbar`);
    firstTargets.add(target.who);
    const res = classify(s, o);
    outcomes.push(res.outcome);
    if (res.outcome !== o.expect) errors.push(`${ow}: Auswertung ergibt „${res.outcome}“, erwartet war „${o.expect}“`);
    checkGeometry(ow, s, o);
  });
  // Optionen müssen sich im Spielfeld klar unterscheiden lassen
  if (broken) return;
  const targets = s.options.map((o) => optionTarget(s, o).at);
  for (let i = 0; i < targets.length; i++)
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i];
      const b = targets[j];
      if (!a || !b) continue;
      const angle = Math.abs(Math.atan2(a[1] - s.you[1], a[0] - s.you[0]) - Math.atan2(b[1] - s.you[1], b[0] - s.you[0])) * (180 / Math.PI);
      const sep = Math.min(angle, 360 - angle);
      if (d(a, b) < 6) errors.push(`${w}: Ziele der Optionen ${i + 1} und ${j + 1} liegen zu nah beieinander`);
      else if (sep < 9) warnings.push(`${w}: Pfeile der Optionen ${i + 1} und ${j + 1} zeigen fast in dieselbe Richtung (${sep.toFixed(0)}°)`);
    }
  const pre = outcomes.filter((x) => x === "pre").length;
  if (pre !== 1) errors.push(`${w}: genau eine Option muss ein Pre-Assist sein (gefunden: ${pre})`);
  if (new Set(outcomes).size < 3) warnings.push(`${w}: nur ${new Set(outcomes).size} verschiedene Ausgänge – abwechslungsreicher ist besser`);

  // Buchstaben A–D dürfen niemanden verdecken – in beiden Spiegelungen
  for (const v of [s, mirror(s)]) {
    const targets = v.options.map((o) => optionTarget(v, o).at);
    const spots = letterSpots(v, targets);
    const players = Object.entries(startPositions(v));
    spots.forEach((p, i) => {
      for (const [id, q] of players) {
        const gap = d(p, q);
        if (gap < 2.8) warnings.push(`${w}${v === s ? "" : " (gespiegelt)"}: Buchstabe ${String.fromCharCode(65 + i)} verdeckt fast ${id} (${gap.toFixed(1)})`);
      }
    });
  }

  // Gespiegelt muss dasselbe herauskommen
  const m = mirror(s);
  m.options.forEach((o, i) => {
    if (classify(m, o).outcome !== outcomes[i]) errors.push(`${w}: gespiegelt anderes Ergebnis bei Option ${i + 1}`);
  });
}

function checkSteps(w: string, s: Scene, o: Option): boolean {
  const pos = startPositions(s);
  const exists = (a: Actor) => a in pos;
  let ok = true;
  const need = (sw: string, a: Actor | undefined, what: string) => {
    if (a !== undefined && exists(a)) return;
    errors.push(`${sw}: ${what} ${a ?? "(fehlt)"} gibt es nicht`);
    ok = false;
  };
  if (!Array.isArray(o.steps) || !o.steps.length) {
    errors.push(`${w}: keine Schritte`);
    return false;
  }
  const first = o.steps[0];
  if (first.k !== "pass" || first.from !== "you") {
    errors.push(`${w}: der erste Schritt muss dein Pass sein ({"k":"pass","from":"you",…})`);
    return false;
  }
  let holder: Actor | null = "you";
  let ended = false;
  o.steps.forEach((st, i) => {
    const sw = `${w} Schritt ${i + 1}`;
    if (ended) {
      errors.push(`${sw}: nach Tor, Ballverlust oder Ende darf nichts mehr kommen`);
      ok = false;
      return;
    }
    switch (st.k) {
      case "pass":
        if (st.from !== holder) errors.push(`${sw}: Pass von ${st.from}, aber am Ball ist ${holder}`);
        need(sw, st.to, "Empfänger");
        if (st.to === st.from) errors.push(`${sw}: Pass an sich selbst`);
        if (st.at && !inPitch(st.at)) errors.push(`${sw}: Zielpunkt außerhalb`);
        if (isOpp(st.to) && (!st.aim || isOpp(st.aim) || !exists(st.aim))) {
          errors.push(`${sw}: bei einem abgefangenen Pass mit "aim" den gemeinten Mitspieler angeben`);
          ok = false;
        }
        if (st.aim !== undefined && !isOpp(st.to)) errors.push(`${sw}: "aim" nur bei abgefangenen Pässen`);
        if (isOpp(st.to) && !st.at) {
          errors.push(`${sw}: bei einem abgefangenen Pass mit "at" den Abfangpunkt angeben`);
          ok = false;
        }
        holder = st.to;
        if (isOpp(st.to)) ended = true;
        break;
      case "carry":
        need(sw, st.who, "Dribbler");
        if (st.who !== holder) errors.push(`${sw}: Dribbling von ${st.who}, aber am Ball ist ${holder}`);
        if (!inPitch(st.to)) errors.push(`${sw}: Dribbling endet außerhalb`);
        break;
      case "shot":
        need(sw, st.who, "Schütze");
        if (st.who !== holder) errors.push(`${sw}: Schuss von ${st.who}, aber am Ball ist ${holder}`);
        if (st.by !== undefined) need(sw, `o${st.by}`, "Gegner");
        holder = null;
        if (st.result === "goal") ended = true;
        else {
          const next = o.steps[i + 1];
          if (next && next.k !== "loose") errors.push(`${sw}: nach einem Schuss ohne Tor geht es nur mit einem Abpraller weiter`);
          if (!next) ended = true;
        }
        break;
      case "loose":
        need(sw, st.to, "Spieler");
        if (st.off !== undefined) need(sw, `o${st.off}`, "Gegner");
        if (!inPitch(st.at)) errors.push(`${sw}: Abpraller landet außerhalb`);
        holder = st.to;
        if (isOpp(st.to)) ended = true;
        break;
      case "foul":
        if (st.on !== holder) errors.push(`${sw}: gefoult werden kann nur, wer am Ball ist (${holder})`);
        if (isOpp(st.on)) errors.push(`${sw}: Foul muss an einem Mitspieler sein`);
        need(sw, st.on, "Gefoulter");
        need(sw, `o${st.by}`, "Gegner");
        ended = true;
        break;
      default:
        errors.push(`${sw}: unbekannter Schritt ${(st as { k: string }).k}`);
        ok = false;
    }
  });
  const last = o.steps[o.steps.length - 1];
  const finished =
    (last.k === "pass" && isOpp(last.to)) || last.k === "shot" || last.k === "foul" || (last.k === "loose" && isOpp(last.to));
  if (!finished) errors.push(`${w}: der Ablauf muss mit Schuss, Elfmeter oder Ballverlust enden`);
  return ok;
}

function checkGeometry(w: string, s: Scene, o: Option) {
  const r = run(s, o);
  o.steps.forEach((st, i) => {
    const sw = `${w} Schritt ${i + 1}`;
    const pos = r.before[i];
    const seg = r.segments.find((x) => x.step === i)!;
    const from = seg.ball[0];
    const opps = Object.entries(pos).filter(([id]) => isOpp(id));
    if (st.k === "pass" && !isOpp(st.to)) {
      // Abseits: beim Abspiel näher zur Torlinie als Ball und vorletzter Gegner (Torwart zählt mit)
      const exempt = i === 0 && (s.restart === "corner" || s.restart === "throw-in");
      const recv = pos[st.to];
      const xs = opps.map(([, p]) => p[0]).sort((a, b) => b - a);
      const secondLast = xs[1] ?? 0;
      if (!exempt && recv[0] > 60 && recv[0] > from[0] + 0.3 && recv[0] > secondLast + 0.3)
        errors.push(`${sw}: ${st.to} steht beim Abspiel im Abseits (x ${recv[0]} hinter vorletztem Gegner x ${secondLast})`);
      const to = st.at ?? pos[st.to];
      const run = d(pos[st.to], to);
      if (run > 18) errors.push(`${sw}: ${st.to} läuft ${run.toFixed(0)} m zum Ball – zu weit`);
      if (d(from, to) < 4) warnings.push(`${sw}: sehr kurzer Pass`);
      // Flachpässe brauchen eine freie Passbahn, sonst wirkt der Ausgang unfair
      if (!st.air)
        for (const [id, p] of opps) {
          const gap = laneDist(p, from, to);
          if (gap < 2.2) errors.push(`${sw}: Gegner ${id} steht in der Passbahn (${gap.toFixed(1)}) – Ball abfangen lassen oder "air": true`);
        }
    }
    if (st.k === "pass" && isOpp(st.to) && st.aim && st.at && pos[st.aim]) {
      // Der Gegner muss sichtbar in der Bahn zum gemeinten Mitspieler stehen
      const aim = pos[st.aim];
      const near = laneDist(pos[st.to], from, aim, 0.05, 0.98);
      const atLane = laneDist(st.at, from, aim, 0, 1);
      if (!(near <= 4.5)) errors.push(`${sw}: abfangender Gegner ${st.to} steht nicht sichtbar in der Bahn zur ${st.aim} (${near.toFixed(1)})`);
      if (!(atLane <= 2)) errors.push(`${sw}: Abfangpunkt liegt nicht auf dem Weg zur ${st.aim}`);
      if (d(pos[st.to], st.at) > 6) errors.push(`${sw}: Gegner ${st.to} muss zu weit zum Abfangpunkt laufen`);
    }
    if (st.k === "foul") {
      const at = pos[st.on];
      if (!(at[0] >= 102 && at[1] >= 18 && at[1] <= 62))
        errors.push(`${sw}: Elfmeter gibt es nur bei Fouls im Strafraum – ${st.on} steht beim Foul bei [${at.map((v) => v.toFixed(0))}]`);
    }
    if (st.k === "loose" && !isOpp(st.to)) {
      // Abseits beim Abpraller: entscheidend ist, wann ein Mitspieler den Ball zuletzt gespielt hat
      const prev = o.steps[i - 1];
      const j = prev && prev.k === "shot" ? i - 1 : i;
      const at = r.before[j];
      const ballAt = r.segments.find((x) => x.step === j)!.ball[0];
      const recv = at[st.to];
      const xs = Object.entries(at)
        .filter(([id]) => isOpp(id))
        .map(([, p]) => p[0])
        .sort((a, b) => b - a);
      const secondLast = xs[1] ?? 0;
      if (recv[0] > 60 && recv[0] > ballAt[0] + 0.3 && recv[0] > secondLast + 0.3)
        errors.push(`${sw}: ${st.to} steht beim letzten Ballkontakt im Abseits und darf den Abpraller nicht nutzen`);
    }
    if (st.k === "carry") {
      const len = d(pos[st.who], st.to);
      if (len > 26) errors.push(`${sw}: Dribbling über ${len.toFixed(0)} m – zu lang`);
    }
    if (st.k === "shot") {
      const [x, y] = st.to;
      if (st.result === "goal" && !(x >= 119.5 && x <= 121 && y > 36.2 && y < 43.8))
        errors.push(`${sw}: Tor muss im Tor landen (x 119.5–121, y 36.2–43.8)`);
      if (st.result === "post" && !(x >= 119 && (Math.abs(y - 36) < 0.8 || Math.abs(y - 44) < 0.8)))
        errors.push(`${sw}: Pfosten bei y 36 oder 44 an der Torlinie`);
      if (st.result === "wide" && !(x >= 117 && (y < 35.6 || y > 44.4))) errors.push(`${sw}: daneben = neben dem Tor (y < 35.6 oder > 44.4)`);
      if (st.result === "saved" && st.by === undefined) errors.push(`${sw}: gehalten – Torwart als "by": 0 angeben`);
      if (st.result === "blocked") {
        if (st.by === undefined) errors.push(`${sw}: geblockt – Gegner als "by" angeben`);
        else if (d(pos[`o${st.by}`], st.to) > 8) errors.push(`${sw}: blockender Gegner zu weit weg`);
      }
      if (d(pos[st.who], [120, 40]) > 36) warnings.push(`${sw}: Schuss aus über 36 m`);
    }
  });
}

// ---------- Vorschau ----------

function svgFor(s: Scene, o: Option | null, caption: string): string {
  const pos = startPositions(s);
  const parts: string[] = [];
  parts.push(`<rect x="40" y="0" width="80" height="80" class="f"/>`);
  parts.push(`<line x1="60" y1="0" x2="60" y2="80" class="m"/><rect x="102" y="18" width="18" height="44" class="m"/><rect x="114" y="30" width="6" height="20" class="m"/><rect x="120" y="36" width="1.5" height="8" class="m"/><path d="M 102 32.7 A 10 10 0 0 0 102 47.3" class="m"/><circle cx="60" cy="40" r="10" class="m"/>`);
  if (!o) {
    s.options.forEach((opt, i) => {
      const to = optionTarget(s, opt).at;
      parts.push(`<line x1="${s.you[0]}" y1="${s.you[1]}" x2="${to[0]}" y2="${to[1]}" class="opt"/>`);
      parts.push(`<text x="${(s.you[0] + to[0]) / 2}" y="${(s.you[1] + to[1]) / 2}" class="ol">${String.fromCharCode(65 + i)}</text>`);
    });
  } else {
    const r = run(s, o);
    const res = classify(s, o);
    r.segments.forEach((seg) => {
      const st = o.steps[seg.step];
      const role = seg.step === res.pre ? "pre" : seg.step === res.assist ? "ast" : st.k === "shot" || st.k === "foul" ? "shot" : st.k === "carry" ? "carry" : "pass";
      const pts = seg.ball.map((p) => p.join(",")).join(" ");
      if (seg.ball[0][0] !== seg.ball[seg.ball.length - 1][0] || seg.ball[0][1] !== seg.ball[seg.ball.length - 1][1])
        parts.push(`<polyline points="${pts}" class="seg ${role}${seg.air ? " air" : ""}"/>`);
      seg.movers.forEach((m) => parts.push(`<line x1="${m.from[0]}" y1="${m.from[1]}" x2="${m.to[0]}" y2="${m.to[1]}" class="mv"/>`));
      const mid = seg.ball[Math.floor(seg.ball.length / 2)];
      parts.push(`<text x="${mid[0]}" y="${mid[1] - 1}" class="sl">${seg.step + 1}</text>`);
    });
  }
  for (const [id, p] of Object.entries(pos)) {
    const cls = id === "you" ? "you" : isOpp(id) ? (id === "o0" ? "gk" : "opp") : "mate";
    parts.push(`<circle cx="${p[0]}" cy="${p[1]}" r="1.9" class="${cls}"/>`);
    const label = id === "you" ? "DU" : id;
    parts.push(`<text x="${p[0]}" y="${p[1] + 0.8}" class="pl">${label}</text>`);
  }
  return `<figure><svg viewBox="38 -2 86 84">${parts.join("")}</svg><figcaption>${caption}</figcaption></figure>`;
}

if (htmlOut) {
  const rows = all.map(({ file, scene }) => {
    const cells = [svgFor(scene, null, `<b>${scene.id}</b> (${file})<br>${scene.title.de}<br><small>${scene.setup.de}</small>`)];
    scene.options.forEach((o, i) => {
      const res = classify(scene, o);
      cells.push(
        svgFor(scene, o, `<b>${String.fromCharCode(65 + i)}: ${o.label.de}</b> → <b class="oc">${res.outcome}</b> (erwartet ${o.expect})<br><small>${o.explain.de}</small>`),
      );
    });
    return `<div class="row">${cells.join("")}</div>`;
  });
  const css = `body{background:#121417;color:#eee;font:12px system-ui;margin:10px}.row{display:flex;gap:8px;margin-bottom:14px}figure{margin:0;width:260px}svg{width:260px;height:256px;display:block}
  .f{fill:#1d3b25}.m{fill:none;stroke:rgba(255,255,255,.35);stroke-width:.3}.you{fill:#ff7a1a;stroke:#fff;stroke-width:.4}.mate{fill:#ffc58f}.opp{fill:#5b6573}.gk{fill:#2f80ed}
  .pl{font-size:1.7px;text-anchor:middle;fill:#111;font-weight:700}.opt{stroke:#fff;stroke-dasharray:1 .8;stroke-width:.4}.ol{fill:#fff;font-size:3px;font-weight:700}
  .seg{fill:none;stroke:#fff;stroke-width:.45}.seg.pre{stroke:#ff7a1a;stroke-width:.8}.seg.ast{stroke:#ffc58f;stroke-width:.7}.seg.shot{stroke:#fff;stroke-dasharray:.6 .4}.seg.carry{stroke:#aaa;stroke-dasharray:.3 .5}.seg.air{stroke-dasharray:1.5 .6}
  .mv{stroke:rgba(255,255,255,.25);stroke-width:.25;stroke-dasharray:.4 .4}.sl{fill:#fff;font-size:2.4px}figcaption{margin-top:4px;line-height:1.3}.oc{color:#ff9a4a}`;
  writeFileSync(htmlOut, `<!doctype html><meta charset="utf-8"><style>${css}</style>${rows.join("")}`);
  console.log(`Vorschau: ${htmlOut}`);
}

for (const x of warnings) console.log(`Warnung: ${x}`);
for (const x of errors) console.log(`FEHLER: ${x}`);
console.log(`${all.length} Szenen in ${files.length} Dateien geprüft – ${errors.length} Fehler, ${warnings.length} Warnungen.`);
process.exit(errors.length ? 1 : 0);
