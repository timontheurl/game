import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import PassGameView from "@/views/PassGameView";

export const metadata: Metadata = {
  title: "Game: Find the pre-assist",
  description:
    "You have the ball: which pass becomes the pre-assist? Decide on the pitch and see whether it turns into a pre-assist, an assist or a misplaced pass.",
  alternates: alternates("passspiel"),
  openGraph: { images: ["/spiele/pre-assist/opengraph-image"] },
};

export default function PassGamePage() {
  return <PassGameView lang="en" />;
}
