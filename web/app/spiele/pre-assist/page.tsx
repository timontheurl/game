import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import PassGameView from "@/views/PassGameView";

export const metadata: Metadata = {
  title: "Spiel: Finde den Pre-Assist",
  description:
    "Du hast den Ball: Welcher Pass wird zum Pre-Assist? Entscheide auf dem Spielfeld und sieh, ob daraus Pre-Assist, Assist oder Fehlpass wird.",
  alternates: alternates("passspiel"),
};

export default function PassSpielPage() {
  return <PassGameView lang="de" />;
}
