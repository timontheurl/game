import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import HomeView from "@/views/HomeView";

export const metadata: Metadata = { alternates: alternates("home") };

export default function Home() {
  return <HomeView lang="de" />;
}
