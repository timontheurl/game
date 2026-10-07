import { searchEntries } from "@/lib/indexes";

// Englische Fassung der Spielersuche
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchEntries("en"));
}
