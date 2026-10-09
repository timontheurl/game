// Duelle unter Freunden: Alles steckt im Link – kein Login, keine Datenbank.

/** Zufallszahlen aus einem Startwert, damit beide Spieler dieselbe Reihenfolge bekommen (mulberry32) */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 36).toString(36);

const NAME_KEY = "preassists-name";
export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ohne Speicher geht es auch */
  }
}

/** Name aus dem Link: kurz und ohne Steuerzeichen */
export const cleanName = (s: string | null) => (s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);

/** Link über das Teilen-Menü schicken, sonst in die Zwischenablage kopieren */
export async function shareLink(link: string, title: string, text: string): Promise<"shared" | "copied" | "aborted" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: link });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "aborted";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${link}`);
    return "copied";
  } catch {
    return "failed";
  }
}
