import assert from "node:assert/strict";
import { test } from "node:test";
import { HANDBOOK, buildPrompt, checkCitations, chunk, retrieve } from "./lab.ts";

const CHUNKS = chunk("handbook", HANDBOOK, 20, 5);

test("chunks overlap and cover the text", () => {
  assert.ok(CHUNKS.length > 1);
  assert.deepEqual(CHUNKS[0]!.text.split(" ").slice(-5), CHUNKS[1]!.text.split(" ").slice(0, 5));
  assert.match(CHUNKS.at(-1)!.text, /finance portal\./);
});

test("retrieves the parental leave passage first", () => {
  const hits = retrieve(CHUNKS, "How many weeks of parental leave do I get?");
  assert.match(hits[0]!.chunk.text, /16 weeks/);
  const scores = hits.map((h) => h.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test("threshold drops irrelevant passages", () => {
  assert.deepEqual(retrieve(CHUNKS, "What is the office wifi password?", 3, 0.2), []);
});

test("prompt contains ids and the grounding rule", () => {
  const hits = retrieve(CHUNKS, "parental leave weeks");
  const prompt = buildPrompt("parental leave weeks", hits);
  assert.ok(prompt.includes(`[${hits[0]!.chunk.id}]`));
  assert.ok(prompt.includes("say you don't know"));
});

test("citation checks", () => {
  const hits = retrieve(CHUNKS, "parental leave weeks", 2);
  const good = hits[0]!.chunk.id;
  assert.deepEqual(checkCitations(`16 weeks [${good}].`, hits), []);
  assert.deepEqual(checkCitations("16 weeks.", hits), ["answer has no citations"]);
  assert.deepEqual(checkCitations("16 weeks [handbook#99].", hits), ["cites handbook#99 which was not retrieved"]);
});
