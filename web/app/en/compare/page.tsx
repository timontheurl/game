import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import CompareView from "@/views/CompareView";

export const metadata: Metadata = {
  title: "Player comparison",
  description: "Two players head to head: pre-assists, assists, goals and per-90 values.",
  alternates: alternates("vergleich"),
  openGraph: { images: ["/vergleich/opengraph-image"] },
};

export default function ComparePage() {
  return <CompareView lang="en" />;
}
