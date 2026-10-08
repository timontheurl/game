"use client";

import { usePathname } from "next/navigation";
import LogoLoader from "@/components/LogoLoader";
import { langFromPath, pick } from "@/lib/i18n";

// Während eine Seite nachgeladen wird
export default function Loading() {
  const lang = langFromPath(usePathname());
  return <LogoLoader label={pick(lang, "Lädt …", "Loading …")} />;
}
