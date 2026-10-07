import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import ClubsView from "@/views/ClubsView";

export const metadata: Metadata = {
  title: "Clubs",
  description: "All clubs by pre-assists: which team sets up its goals most often over two passes?",
  alternates: alternates("vereine"),
  openGraph: { images: ["/vereine/opengraph-image"] },
};

export default function ClubsPage() {
  return <ClubsView lang="en" />;
}
