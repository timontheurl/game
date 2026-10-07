import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Das Pre-Assist-Spiel";

export default function Image() {
  return ogText("Mehr oder weniger?", "Wer hatte mehr Pre-Assists? Schätze, triff und bau deine Serie aus.", "Spiel");
}
