import { loadContent, loadGlossary } from "@/content";
import { buildSearchIndex } from "@/lib/search";

// Full-text search index, fetched by the sidebar only when someone searches.
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex(loadContent().lessons, loadGlossary()));
}
