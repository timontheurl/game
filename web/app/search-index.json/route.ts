import { searchEntries } from "@/lib/indexes";

// Alle Spieler für die Suche als statische JSON-Datei.
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchEntries("de"));
}
