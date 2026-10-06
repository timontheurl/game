import { OG_SIZE, ogText } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Rekorde";

export default function Image() {
  return ogText("Rekorde", "Meiste Pre-Assists, beste Quote, längster Pass und das eingespielteste Trio.", "Bestwerte");
}
