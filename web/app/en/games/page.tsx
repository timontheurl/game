import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import GamesView from "@/views/GamesView";

export const metadata: Metadata = {
  title: "Games",
  description: "Games about the pre-assist: find the pre-assist on the pitch, higher or lower and who is it?",
  alternates: alternates("spiele"),
  openGraph: { images: ["/spiele/opengraph-image"] },
};

export default function GamesPage() {
  return <GamesView lang="en" />;
}
