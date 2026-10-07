import { compareEntries } from "@/lib/indexes";

// Alle Spieler-Saisons als statische JSON-Datei für den Spielervergleich.
export const dynamic = "force-static";

export function GET() {
  return Response.json(compareEntries("de"));
}
