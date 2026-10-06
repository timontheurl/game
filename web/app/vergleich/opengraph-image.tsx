import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Spielervergleich";

export default function Image() {
  return ogText("Spieler-Duell", "Zwei Spieler, alle Werte: Pre-Assists, Assists, Tore und Quoten pro 90 Minuten.", "Vergleich");
}
