import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import GamesView from "@/views/GamesView";

export const metadata: Metadata = {
  title: "Games",
  description: "Games about the pre-assist: Find the pre-assist on the pitch, “Higher or lower?” and “Who is it?”",
  alternates: alternates("spiele"),
};

export default function GamesPage() {
  return <GamesView lang="en" />;
}
