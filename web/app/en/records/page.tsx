import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import RecordsView from "@/views/RecordsView";

export const metadata: Metadata = {
  title: "Records",
  description: "Pre-assist records: most in a season, best rate, longest pass, best-drilled trio.",
  alternates: alternates("rekorde"),
  openGraph: { images: ["/rekorde/opengraph-image"] },
};

export default function RecordsPage() {
  return <RecordsView lang="en" />;
}
