// Retrieve, then check the citations: a tiny RAG pipeline with no dependencies.
//
// Uses word-count vectors and cosine similarity instead of a real embedding
// model so it runs offline. The shape is the same as production RAG:
// chunk -> index -> score -> threshold -> build prompt -> verify citations.
// Run with: node lab.ts

const STOP = new Set(["a", "an", "the", "of", "to", "in", "is", "do", "i", "how", "many", "what", "and", "for", "can", "be", "get", "my"]);

export type Chunk = { id: string; text: string };
export type Hit = { chunk: Chunk; score: number };

/** Split into overlapping windows of `size` words. */
export function chunk(docId: string, text: string, size = 40, overlap = 10): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const step = size - overlap;
  const out: Chunk[] = [];
  for (let start = 0, i = 0; start < Math.max(words.length - overlap, 1); start += step, i++) {
    out.push({ id: `${docId}#${i}`, text: words.slice(start, start + size).join(" ") });
  }
  return out;
}

export function vectorise(text: string): Map<string, number> {
  const v = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) if (!STOP.has(w)) v.set(w, (v.get(w) ?? 0) + 1);
  return v;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [w, n] of a) dot += n * (b.get(w) ?? 0);
  const norm = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, n) => s + n * n, 0));
  const d = norm(a) * norm(b);
  return d ? dot / d : 0;
}

/** Top-k chunks by similarity, dropping anything below the relevance threshold. */
export function retrieve(chunks: Chunk[], question: string, k = 3, minScore = 0.1): Hit[] {
  const q = vectorise(question);
  return chunks
    .map((c) => ({ chunk: c, score: cosine(q, vectorise(c.text)) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .filter((h) => h.score >= minScore);
}

export function buildPrompt(question: string, hits: Hit[]): string {
  const context = hits.map((h) => `[${h.chunk.id}] ${h.chunk.text}`).join("\n");
  return "Answer only from <context>. Cite chunk ids in [brackets]. If the answer is not in the context, say you don't know.\n"
    + `<context>\n${context}\n</context>\nQuestion: ${question}`;
}

export function citedIds(answer: string): Set<string> {
  return new Set([...answer.matchAll(/\[([^\]]+#\d+)\]/g)].map((m) => m[1]!));
}

/** Problems found: no citations, or citations of chunks that were never retrieved. */
export function checkCitations(answer: string, hits: Hit[]): string[] {
  const cited = citedIds(answer);
  const retrieved = new Set(hits.map((h) => h.chunk.id));
  if (cited.size === 0) return ["answer has no citations"];
  return [...cited].filter((id) => !retrieved.has(id)).sort().map((id) => `cites ${id} which was not retrieved`);
}

export const HANDBOOK =
  "Annual leave: every employee gets 20 days of paid annual leave per year. Unused days carry over up to five days. "
  + "Parental leave: employees receive 16 weeks of paid parental leave. Parental leave can be split into two blocks "
  + "taken within the first year. Expenses: submit receipts within 30 days through the finance portal.";

if (import.meta.main) {
  const chunks = chunk("handbook", HANDBOOK, 20, 5);
  const hits = retrieve(chunks, "How many weeks of parental leave do I get?");
  for (const h of hits) console.log(`${h.score.toFixed(2)} [${h.chunk.id}] ${h.chunk.text.slice(0, 60)}…`);
  console.log(checkCitations(`16 weeks paid [${hits[0]!.chunk.id}].`, hits));
}
