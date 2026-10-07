import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import ChainsView from "@/views/ChainsView";

export const metadata: Metadata = {
  title: "Goal chains",
  description: "Every goal as a move: pre-assist, assist and finish – filter, sort and watch as an animation.",
  alternates: alternates("torketten"),
  openGraph: { images: ["/torketten/opengraph-image"] },
};

export default function GoalChainsPage() {
  return <ChainsView lang="en" />;
}
