import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Torketten";

export default function Image() {
  return ogText("Torketten", "Jedes Tor als Spielzug: Pre-Assist, Assist und Abschluss – als Animation.", "Explorer");
}
