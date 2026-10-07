// Teilbare Bilder (1080 × 1350, Hochformat für Instagram & Co.), direkt im Browser gezeichnet.
// Läuft nur im Client – nutzt Canvas und die FontFace-API.

import type { Goal } from "./data";
import { num, t, type Lang } from "./i18n";

export const SHARE_W = 1080;
export const SHARE_H = 1350;

const C = {
  bg: "#121417",
  surface: "#1b1e23",
  line: "rgba(255,255,255,0.28)",
  text: "#eef1f4",
  muted: "#8d96a0",
  orange: "#ff7a1a",
  peach: "#ffc58f",
  white: "#ffffff",
};

let fontsReady: Promise<void> | null = null;

/** Lädt die Barlow-Schriften einmalig für das Zeichnen auf dem Canvas. */
function loadFonts() {
  fontsReady ??= (async () => {
    const faces = [
      new FontFace("ShareDisplay", "url(/fonts/BarlowCondensed-ExtraBoldItalic.ttf)", { weight: "800", style: "italic" }),
      new FontFace("ShareCondensed", "url(/fonts/BarlowCondensed-Bold.ttf)", { weight: "700" }),
      new FontFace("ShareBody", "url(/fonts/Barlow-Regular.ttf)", { weight: "400" }),
    ];
    await Promise.all(faces.map((f) => f.load().then(() => document.fonts.add(f))));
  })();
  return fontsReady;
}

function canvas() {
  const el = document.createElement("canvas");
  el.width = SHARE_W;
  el.height = SHARE_H;
  return [el, el.getContext("2d")!] as const;
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, SHARE_W, 14);

  // Marke oben links
  ctx.fillStyle = C.orange;
  roundRect(ctx, 64, 64, 64, 64, 12);
  ctx.fill();
  ctx.fillStyle = "#1f0c00";
  ctx.font = "italic 800 34px ShareDisplay";
  ctx.textAlign = "center";
  ctx.fillText("PA", 96, 108);
  ctx.textAlign = "left";
  ctx.font = "italic 800 46px ShareDisplay";
  ctx.fillStyle = C.text;
  ctx.fillText("PRE", 148, 112);
  const w = ctx.measureText("PRE").width;
  ctx.fillStyle = C.orange;
  ctx.fillText("ASSISTS", 148 + w, 112);

  // Fußzeile
  ctx.fillStyle = C.muted;
  ctx.font = "400 30px ShareBody";
  ctx.fillText("preassists.at", 64, SHARE_H - 60);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, start: number, maxW: number) {
  let size = start;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxW && size > 20) {
    size -= 2;
    ctx.font = font(size);
  }
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = width * 3.4;
  const ex = x2 - Math.cos(a) * head * 0.8;
  const ey = y2 - Math.sin(a) * head * 0.8;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
  ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
  ctx.closePath();
  ctx.fill();
}

function pitch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const s = w / 120; // StatsBomb: 120 × 80
  const h = 80 * s;
  ctx.fillStyle = "#171a1e";
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 10; i += 2) {
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fillRect(x + i * 12 * s, y, 12 * s, h);
  }
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + 60 * s, y);
  ctx.lineTo(x + 60 * s, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 60 * s, y + 40 * s, 10 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(x + 102 * s, y + 18 * s, 18 * s, 44 * s);
  ctx.strokeRect(x + 114 * s, y + 30 * s, 6 * s, 20 * s);
  ctx.strokeRect(x, y + 18 * s, 18 * s, 44 * s);
  ctx.strokeRect(x, y + 30 * s, 6 * s, 20 * s);
  return (p: [number, number]): [number, number] => [x + p[0] * s, y + p[1] * s];
}

function dot(ctx: CanvasRenderingContext2D, p: [number, number], color: string, label: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = C.bg;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p[0], p[1], 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.bg;
  ctx.font = "700 22px ShareCondensed";
  ctx.textAlign = "center";
  ctx.fillText(label, p[0], p[1] + 8);
  ctx.textAlign = "left";
}

export interface GoalShareInput {
  goal: Goal;
  names: Record<string, string>;
  matchLabel: string;
  context: string; // z. B. "Premier League 2015/16 · 87'"
}

/** Bild eines Spielzugs: Pre-Assist › Assist › Tor auf dem Spielfeld. */
export async function renderGoalImage(
  { goal, names, matchLabel, context }: GoalShareInput,
  lang: Lang = "de",
): Promise<Blob> {
  await loadFonts();
  const [el, ctx] = canvas();
  frame(ctx);

  ctx.fillStyle = C.orange;
  ctx.font = "700 32px ShareCondensed";
  ctx.fillText(context.toUpperCase(), 64, 210);
  ctx.fillStyle = C.text;
  fitText(ctx, matchLabel.toUpperCase(), (n) => `italic 800 ${n}px ShareDisplay`, 72, SHARE_W - 128);
  ctx.fillText(matchLabel.toUpperCase(), 64, 285);

  const map = pitch(ctx, 64, 340, SHARE_W - 128);
  const P = (p: [number, number]) => map(p);
  if (goal.pre) arrow(ctx, ...P(goal.pre.start), ...P(goal.pre.end), C.orange, 7);
  if (goal.assist) arrow(ctx, ...P(goal.assist.start), ...P(goal.assist.end), C.peach, 7);
  arrow(ctx, ...P(goal.shot.start), ...P(goal.shot.end ?? [120, 40]), C.white, 7);
  if (goal.pre) dot(ctx, P(goal.pre.start), C.orange, "1");
  if (goal.assist) dot(ctx, P(goal.assist.start), C.peach, goal.pre ? "2" : "1");
  dot(ctx, P(goal.shot.start), C.white, lang === "en" ? "G" : "T");

  const rows: [string, string, string][] = [];
  if (goal.pre) rows.push(["PRE-ASSIST", names[String(goal.pre.player)], C.orange]);
  if (goal.assist) rows.push(["ASSIST", names[String(goal.assist.player)], C.peach]);
  rows.push([t(lang, "img.goal"), names[String(goal.scorer)], C.white]);
  let y = 1065;
  for (const [label, name, color] of rows) {
    ctx.fillStyle = color;
    ctx.font = "700 30px ShareCondensed";
    ctx.fillText(label, 64, y);
    ctx.fillStyle = C.text;
    fitText(ctx, name, (n) => `italic 800 ${n}px ShareDisplay`, 54, SHARE_W - 400);
    ctx.fillText(name, 300, y + 4);
    y += 72;
  }
  ctx.textAlign = "right";
  ctx.fillStyle = C.muted;
  ctx.font = "400 30px ShareBody";
  ctx.fillText(`xG ${num(lang, goal.xg, 2)}`, SHARE_W - 64, SHARE_H - 60);
  ctx.textAlign = "left";

  return toBlob(el);
}

export interface PlayerShareInput {
  name: string;
  team: string;
  season: string;
  position: string | null;
  preAssists: number;
  assists: number;
  goals: number;
  xpa: number;
  rank: number;
}

/** Spielerkarte als Bild. */
export async function renderPlayerImage(p: PlayerShareInput, lang: Lang = "de"): Promise<Blob> {
  await loadFonts();
  const [el, ctx] = canvas();
  frame(ctx);

  ctx.fillStyle = C.orange;
  ctx.font = "700 34px ShareCondensed";
  ctx.fillText([p.position, p.team, p.season].filter(Boolean).join(" · ").toUpperCase(), 64, 230);
  ctx.fillStyle = C.text;
  fitText(ctx, p.name.toUpperCase(), (n) => `italic 800 ${n}px ShareDisplay`, 120, SHARE_W - 128);
  ctx.fillText(p.name.toUpperCase(), 64, 345);

  // Große Zahl in einer Karte mit orangem Rand
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 6;
  roundRect(ctx, 64, 420, SHARE_W - 128, 460, 28);
  const grad = ctx.createLinearGradient(0, 420, 0, 880);
  grad.addColorStop(0, "rgba(255,122,26,0.28)");
  grad.addColorStop(1, "rgba(20,20,24,0.9)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = C.orange;
  ctx.font = "italic 800 300px ShareDisplay";
  ctx.fillText(String(p.preAssists), SHARE_W / 2, 750);
  ctx.fillStyle = C.peach;
  ctx.font = "700 46px ShareCondensed";
  ctx.fillText(t(lang, "img.rank", { n: p.rank }), SHARE_W / 2, 835);

  const stats: [string, string][] = [
    [String(p.assists), "Assists"],
    [String(p.goals), t(lang, "common.goals")],
    [num(lang, p.xpa, 2), "xPA"],
  ];
  stats.forEach(([v, l], i) => {
    const x = 64 + ((SHARE_W - 128) / 3) * (i + 0.5);
    ctx.fillStyle = C.text;
    ctx.font = "italic 800 110px ShareDisplay";
    ctx.fillText(v, x, 1060);
    ctx.fillStyle = C.muted;
    ctx.font = "400 34px ShareBody";
    ctx.fillText(l, x, 1110);
  });
  ctx.textAlign = "left";
  return toBlob(el);
}

function toBlob(el: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => el.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild fehlgeschlagen"))), "image/png"));
}

/** Teilt das Bild über das Teilen-Menü des Geräts oder lädt es herunter. */
export async function shareOrDownload(blob: Blob, filename: string, title: string, url: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, url });
      return "geteilt";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "abgebrochen";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "heruntergeladen";
}
