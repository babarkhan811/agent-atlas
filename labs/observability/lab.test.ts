import assert from "node:assert/strict";
import { test } from "node:test";
import { Tracer, runAgent, summarize, type ModelTurn } from "./lab.ts";

const TOOL_TURN: ModelTurn = { stop_reason: "tool_use", text: "", tool_call: { id: "toolu_1", name: "lookup_order", input: { order_id: "A-5521" } },
  usage: { input_tokens: 340, cache_read_input_tokens: 2900, output_tokens: 60 } };
const FINAL_TURN: ModelTurn = { stop_reason: "end_turn", text: "Your refund was issued on 3 Nov.",
  usage: { input_tokens: 120, cache_read_input_tokens: 3200, output_tokens: 40 } };

function flakyLookup() {
  let n = 0;
  return ({ order_id }: { order_id: string }) => {
    n++;
    if (n === 1) { const e = new Error("orders API took longer than 3 s"); e.name = "TimeoutError"; throw e; }
    return `${order_id}: refunded 2026-11-03`;
  };
}

async function runOnce(capture = false) {
  const tracer = new Tracer(capture);
  const turns = [TOOL_TURN, FINAL_TURN];
  const answer = await runAgent(tracer, () => turns.shift()!, { lookup_order: flakyLookup() }, "Where is my refund?");
  return { tracer, answer };
}

test("spans form one tree with convention names", async () => {
  const { tracer, answer } = await runOnce();
  assert.equal(answer, "Your refund was issued on 3 Nov.");
  assert.deepEqual(tracer.spans.map((s) => s.name), ["invoke_agent support-agent", "chat example-model",
    "execute_tool lookup_order", "execute_tool lookup_order", "chat example-model"]);
  const root = tracer.spans[0]!;
  assert.equal(new Set(tracer.spans.map((s) => s.traceId)).size, 1);
  assert.ok(tracer.spans.slice(1).every((s) => s.parentId === root.spanId));
});

test("errors are recorded on the failing span and retried", async () => {
  const { tracer } = await runOnce();
  const [first, second] = tracer.spans.filter((s) => s.name.startsWith("execute_tool"));
  assert.deepEqual([first!.status, first!.attributes["error.type"]], ["ERROR", "TimeoutError"]);
  assert.equal(first!.events[0]!.name, "exception");
  assert.deepEqual([second!.status, second!.attributes["attempt"]], ["OK", 2]);
});

test("usage follows the convention and sums per run", async () => {
  const { tracer } = await runOnce();
  const chat = tracer.spans[1]!;
  assert.equal(chat.attributes["gen_ai.usage.input_tokens"], 3240);
  assert.deepEqual(chat.attributes["gen_ai.response.finish_reasons"], ["tool_use"]);
  const t = summarize(tracer);
  assert.deepEqual([t.modelCalls, t.toolCalls, t.errors, t.inputTokens, t.outputTokens], [2, 2, 1, 6560, 100]);
  assert.ok(t.duration > 0);
});

test("content is left out unless capture is enabled", async () => {
  const off = (await runOnce(false)).tracer.spans[0]!.attributes;
  assert.equal("gen_ai.input.messages" in off, false);
  assert.equal(off["gen_ai.input.messages.length"], "Where is my refund?".length);
  const on = (await runOnce(true)).tracer.spans[0]!.attributes;
  assert.equal(on["gen_ai.input.messages"], "Where is my refund?");
});
