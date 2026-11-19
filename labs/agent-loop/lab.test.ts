import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BUDGET, run, type Model, type ToolCall, type Turn } from "./lab.ts";

const TOOLS = { list_issues: () => "12 open bugs", read_issue: ({ id }: Record<string, unknown>) => `issue ${id}: details` };
const scripted = (turns: Turn[]): Model => ({ async respond() { return turns.shift()!; } });
const call = (id: number, name = "list_issues", input: Record<string, unknown> = { state: "open" }): ToolCall => ({ id: String(id), name, input });
const tool = (c: ToolCall, tokens = 10): Turn => ({ text: "", toolCalls: [c], tokens });
const answer = (text: string, tokens = 10): Turn => ({ text, toolCalls: [], tokens });

test("finishes when the model stops calling tools", async () => {
  const r = await run(scripted([tool(call(1), 100), answer("done", 200)]), TOOLS, "goal");
  assert.deepEqual(r, { stop: "done", answer: "done", turns: 2, tokens: 300, calls: ["list_issues"] });
});

test("turn budget", async () => {
  const turns = [0, 1, 2, 3, 4].map((i) => tool(call(i, "read_issue", { id: i })));
  const r = await run(scripted(turns), TOOLS, "goal", { ...DEFAULT_BUDGET, maxTurns: 3 });
  assert.equal(r.stop, "max_turns");
  assert.equal(r.turns, 3);
});

test("token budget", async () => {
  const turns = [0, 1, 2, 3, 4].map((i) => tool(call(i, "read_issue", { id: i }), 400));
  const r = await run(scripted(turns), TOOLS, "goal", { ...DEFAULT_BUDGET, maxTokens: 1000 });
  assert.equal(r.stop, "max_tokens");
  assert.ok(r.tokens > 1000);
});

test("repeated identical calls are a loop", async () => {
  const turns = [0, 1, 2, 3, 4].map((i) => tool(call(i)));
  const r = await run(scripted(turns), TOOLS, "goal", { ...DEFAULT_BUDGET, maxRepeats: 2 });
  assert.equal(r.stop, "loop_detected");
  assert.deepEqual(r.calls, ["list_issues", "list_issues"]);
});

test("argument order does not hide a loop", async () => {
  const a = call(1, "list_issues", { state: "open", label: "bug" });
  const b = call(2, "list_issues", { label: "bug", state: "open" });
  const r = await run(scripted([tool(a), tool(b)]), { list_issues: () => "x" }, "g", { ...DEFAULT_BUDGET, maxRepeats: 1 });
  assert.equal(r.stop, "loop_detected");
});

test("tool errors are returned, not thrown", async () => {
  const r = await run(scripted([tool(call(1, "nope")), answer("gave up")]), TOOLS, "goal");
  assert.equal(r.stop, "done");
});
