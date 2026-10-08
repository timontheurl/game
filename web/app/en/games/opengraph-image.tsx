import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Games about the pre-assist";

export default function Image() {
  return ogText("Games", "Find the pre-assist, “Higher or lower?” and “Who is it?” – test your eye for the pass before the assist.", "3 games");
}
