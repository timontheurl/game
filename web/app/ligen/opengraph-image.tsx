import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ligen auf PreAssists";

export default function Image() {
  return ogText("Ligen", "Pre-Assist-Ranglisten für Premier League, La Liga, Bundesliga – und bald noch mehr.", "Übersicht");
}
