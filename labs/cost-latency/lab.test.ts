import assert from "node:assert/strict";
import { test } from "node:test";
import { Meter, callCost, costPerCompletedTask, runTask, type Step, type Usage } from "./lab.ts";

const MAIN: Usage = { input_tokens: 2_000, cache_read_input_tokens: 10_000, output_tokens: 800 };
const SMALL: Usage = { input_tokens: 600, output_tokens: 20 };
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const step = (model: string, u: Usage): Step => ({ model, projected: u, actual: u });

test("worked example from the lesson", () => {
  close(callCost("large", MAIN), 0.021);
  close(callCost("small", SMALL), 0.000175);
});

test("cache reads are cheaper than uncached input", () => {
  close(callCost("large", { input_tokens: 12_000, output_tokens: 800 }) - callCost("large", MAIN), 0.027);
});

test("cache write premium depends on ttl", () => {
  assert.equal(callCost("large", { cache_creation_input_tokens: 1_000_000 }), 3.75);
  assert.equal(callCost("large", { cache_creation_input_tokens: 1_000_000, cache_ttl: "1h" }), 6);
});

test("task completes within budget", () => {
  const meter = new Meter({ perTask: 0.05, perUserDay: 1.0 });
  const r = runTask("t1", "ana", [step("small", SMALL), step("large", MAIN)], meter);
  assert.equal(r.status, "completed");
  close(r.cost, 0.021175);
});

test("task stops gracefully before breaking its budget", () => {
  const meter = new Meter({ perTask: 0.05, perUserDay: 1.0 });
  const r = runTask("t2", "ana", [step("large", MAIN), step("large", MAIN), step("large", MAIN)], meter);
  assert.deepEqual([r.status, r.calls, r.stoppedBy], ["budget_stop", 2, "task budget"]);
  assert.ok(r.cost <= 0.05);
});

test("daily user budget applies across tasks", () => {
  const meter = new Meter({ perTask: 1.0, perUserDay: 0.03 });
  runTask("a", "ben", [step("large", MAIN)], meter);
  assert.equal(runTask("b", "ben", [step("large", MAIN)], meter).stoppedBy, "daily user budget");
});

test("cost per completed task includes wasted spend", () => {
  close(costPerCompletedTask([
    { status: "completed", cost: 0.02, calls: 2 },
    { status: "budget_stop", cost: 0.05, calls: 3 },
    { status: "completed", cost: 0.02, calls: 2 },
  ]), 0.045);
});
