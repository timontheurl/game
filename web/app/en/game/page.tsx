import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import GameView from "@/views/GameView";

export const metadata: Metadata = {
  title: "Quiz: Higher or lower?",
  description: "The numbers quiz: who had more pre-assists? Or work out the player from their numbers.",
  alternates: alternates("spiel"),
  openGraph: { images: ["/spiel/opengraph-image"] },
};

export default function GamePage() {
  return <GameView lang="en" />;
}
