import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import LeaguesView from "@/views/LeaguesView";

export const metadata: Metadata = {
  title: "Ligen",
  description: "Alle Ligen auf PreAssists – mit Pre-Assist-Ranglisten und den Ligen, die als Nächstes dazukommen.",
  alternates: alternates("ligen"),
};

export default function LigenPage() {
  return <LeaguesView lang="de" />;
}
