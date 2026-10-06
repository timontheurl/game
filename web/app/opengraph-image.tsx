import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "PreAssists – der Pass vor dem Assist";

export default function Image() {
  return ogText("Jedes Tor hat eine Vorgeschichte.", "Ranglisten, Spielerkarten und Torketten zum Pre-Assist: dem Pass, der zum Assist führt.", "Die Anlaufstelle für Pre-Assists");
}
