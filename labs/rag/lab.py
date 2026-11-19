"""Retrieve, then check the citations: a tiny RAG pipeline with the standard library.

Uses word-count vectors and cosine similarity instead of a real embedding
model so it runs offline. The shape is the same as production RAG:
chunk -> index -> score -> threshold -> build prompt -> verify citations.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

STOP = {"a", "an", "the", "of", "to", "in", "is", "do", "i", "how", "many", "what", "and", "for", "can", "be", "get", "my"}


@dataclass
class Chunk:
    id: str
    text: str


def chunk(doc_id: str, text: str, size: int = 40, overlap: int = 10) -> list[Chunk]:
    """Split into overlapping windows of `size` words."""
    words = text.split()
    step = size - overlap
    return [Chunk(f"{doc_id}#{i}", " ".join(words[start:start + size]))
            for i, start in enumerate(range(0, max(len(words) - overlap, 1), step))]


def vectorise(text: str) -> Counter:
    return Counter(w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP)


def cosine(a: Counter, b: Counter) -> float:
    dot = sum(a[w] * b[w] for w in a if w in b)
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def retrieve(chunks: list[Chunk], question: str, k: int = 3, min_score: float = 0.1) -> list[tuple[Chunk, float]]:
    """Top-k chunks by similarity, dropping anything below the relevance threshold."""
    q = vectorise(question)
    scored = sorted(((c, cosine(q, vectorise(c.text))) for c in chunks), key=lambda x: x[1], reverse=True)
    return [(c, s) for c, s in scored[:k] if s >= min_score]


def build_prompt(question: str, hits: list[tuple[Chunk, float]]) -> str:
    context = "\n".join(f"[{c.id}] {c.text}" for c, _ in hits)
    return ("Answer only from <context>. Cite chunk ids in [brackets]. "
            "If the answer is not in the context, say you don't know.\n"
            f"<context>\n{context}\n</context>\nQuestion: {question}")


def cited_ids(answer: str) -> set[str]:
    return set(re.findall(r"\[([^\]]+#\d+)\]", answer))


def check_citations(answer: str, hits: list[tuple[Chunk, float]]) -> list[str]:
    """Problems found: no citations, or citations of chunks that were never retrieved."""
    cited, retrieved = cited_ids(answer), {c.id for c, _ in hits}
    if not cited:
        return ["answer has no citations"]
    return [f"cites {cid} which was not retrieved" for cid in sorted(cited - retrieved)]


HANDBOOK = (
    "Annual leave: every employee gets 20 days of paid annual leave per year. Unused days carry over up to five days. "
    "Parental leave: employees receive 16 weeks of paid parental leave. Parental leave can be split into two blocks "
    "taken within the first year. Expenses: submit receipts within 30 days through the finance portal."
)

if __name__ == "__main__":
    chunks = chunk("handbook", HANDBOOK, size=20, overlap=5)
    hits = retrieve(chunks, "How many weeks of parental leave do I get?")
    for c, s in hits:
        print(f"{s:.2f} [{c.id}] {c.text[:60]}...")
    print(check_citations(f"16 weeks paid [{hits[0][0].id}].", hits))
