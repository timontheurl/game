import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Spiele rund um den Pre-Assist";

export default function Image() {
  return ogText("Spiele", "Finde den Pre-Assist, „Mehr oder weniger?“ und „Wer ist es?“ – teste dein Auge für den Pass vor dem Assist.", "3 Spiele");
}
