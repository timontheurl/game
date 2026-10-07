import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import ChainsView from "@/views/ChainsView";

export const metadata: Metadata = {
  title: "Torketten",
  description: "Jedes Tor als Spielzug: Pre-Assist, Assist und Abschluss – filtern, sortieren und als Animation ansehen.",
  alternates: alternates("torketten"),
};

export default function TorkettenPage() {
  return <ChainsView lang="de" />;
}
