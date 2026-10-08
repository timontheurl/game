import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import GameView from "@/views/GameView";

export const metadata: Metadata = {
  title: "Spiel: Mehr oder weniger?",
  description: "Das Pre-Assist-Spiel: Wer hatte mehr Pre-Assists? Oder errate den Spieler aus seinen Werten.",
  alternates: alternates("spiel"),
};

export default function SpielPage() {
  return <GameView lang="de" />;
}
