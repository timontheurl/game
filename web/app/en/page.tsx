import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import HomeView from "@/views/HomeView";

export const metadata: Metadata = {
  title: { absolute: "PreAssists – Who plays the pass before the assist?" },
  alternates: alternates("home"),
};

export default function HomeEn() {
  return <HomeView lang="en" />;
}
