import { describe, expect, it } from "vitest";
import { loadContent, loadGlossary } from "@/content";
import { buildSearchIndex, searchLessons, searchTerms } from "@/lib/search";

const index = buildSearchIndex(loadContent().lessons, loadGlossary());

// Bug 3: search used to index only title, summary and category.
describe("full-text search", () => {
  it("finds words that only appear inside step payloads", () => {
    const hits = searchLessons(index, "JSON-RPC");
    expect(hits.map((h) => h.id)).toContain("mcp");
    expect(hits.find((h) => h.id === "mcp")!.step).toBe(0);
  });

  it("finds step text and glossary definitions", () => {
    expect(searchLessons(index, "temperature").map((h) => h.id)).toContain("llm-call");
    expect(searchTerms(index, "temperature").map((t) => t.term)).toEqual(["Temperature"]);
  });

  it("requires every word, in any order", () => {
    expect(searchLessons(index, "beaconing detection").map((h) => h.id)).toEqual(["threat-hunting"]);
    expect(searchLessons(index, "zzzz-no-such-word")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchLessons(index, "   ")).toEqual([]);
    expect(searchTerms(index, "")).toEqual([]);
  });
});
