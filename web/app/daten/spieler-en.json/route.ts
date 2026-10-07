import { compareEntries } from "@/lib/indexes";

// Englische Fassung für den Spielervergleich unter /en/compare/
export const dynamic = "force-static";

export function GET() {
  return Response.json(compareEntries("en"));
}
