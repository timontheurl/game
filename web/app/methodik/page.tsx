import type { Metadata } from "next";
import { alternates } from "@/lib/i18n";
import MethodView from "@/views/MethodView";

export const metadata: Metadata = { title: "Methodik", alternates: alternates("methodik") };

export default function MethodikPage() {
  return <MethodView lang="de" />;
}
