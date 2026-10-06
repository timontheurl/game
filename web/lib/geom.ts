export type Pt = [number, number];

/** Punkte eines Pfeilspitzen-Dreiecks mit der Spitze in `to`. */
export function arrowHead(from: Pt, to: Pt, length: number, width: number): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = to[0] - ux * length;
  const by = to[1] - uy * length;
  const px = -uy * (width / 2);
  const py = ux * (width / 2);
  const f = (n: number) => n.toFixed(2);
  return `${f(to[0])},${f(to[1])} ${f(bx + px)},${f(by + py)} ${f(bx - px)},${f(by - py)}`;
}

/** Linie, die kurz vor der Pfeilspitze endet, damit die Spitze sauber sitzt. */
export function shorten(from: Pt, to: Pt, by: number): Pt {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.max(0, (len - by) / len);
  return [from[0] + dx * k, from[1] + dy * k];
}
