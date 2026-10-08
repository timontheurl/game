import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Finde den Pre-Assist";

export default function Image() {
  return ogText("Finde den Pre-Assist", "Du hast den Ball: Welcher Pass wird zum Pre-Assist? Entscheide auf dem Spielfeld.", "Spiel");
}
