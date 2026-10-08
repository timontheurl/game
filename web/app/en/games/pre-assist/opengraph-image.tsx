import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Find the pre-assist";

export default function Image() {
  return ogText("Find the pre-assist", "You have the ball: which pass becomes the pre-assist? Decide on the pitch.", "Game");
}
