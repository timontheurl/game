import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import GamesView from "@/views/GamesView";

export const metadata: Metadata = {
  title: "Spiele",
  description: "Spiele rund um den Pre-Assist: Finde den Pre-Assist auf dem Spielfeld, Mehr oder weniger und Wer ist es?",
  alternates: alternates("spiele"),
};

export default function SpielePage() {
  return <GamesView lang="de" />;
}
