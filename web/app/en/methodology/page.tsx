import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import MethodView from "@/views/MethodView";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How PreAssists counts pre-assists: the rules, the metrics (xPA, pre-assist xG) and the data source.",
  alternates: alternates("methodik"),
};

export default function MethodologyPage() {
  return <MethodView lang="en" />;
}
