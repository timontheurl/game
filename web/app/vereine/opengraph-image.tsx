import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Vereine nach Pre-Assists";

export default function Image() {
  return ogText("Vereine", "Welche Mannschaft spielt ihre Tore am häufigsten über zwei Stationen heraus?", "Übersicht");
}
