import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import LeaguesView from "@/views/LeaguesView";

export const metadata: Metadata = {
  title: "Competitions",
  description: "All leagues on PreAssists – with pre-assist rankings and the leagues coming next.",
  alternates: alternates("ligen"),
  openGraph: { images: ["/ligen/opengraph-image"] },
};

export default function LeaguesPage() {
  return <LeaguesView lang="en" />;
}
