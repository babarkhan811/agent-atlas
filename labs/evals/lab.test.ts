import assert from "node:assert/strict";
import { test } from "node:test";
import { gate, keywordJudge, runSuite, type Agent, type Case, type Report } from "./lab.ts";

const CASES: Case[] = [
  { id: "refund-1", input: "Refund damaged order", tags: ["refunds"], expectedTool: "issue_refund", maxAmount: 200 },
  { id: "track-1", input: "Where is my order?", tags: ["tracking"], expectedTool: "get_order_status" },
];
const GOOD_REPLY = "Sorry about that. Next, you'll get an email.";
const goodAgent: Agent = (c) => ({ toolsCalled: [c.expectedTool], reply: GOOD_REPLY, ...(c.maxAmount ? { amount: 120 } : {}) });

test("all passing", () => {
  const r = runSuite(goodAgent, keywordJudge, CASES, 3);
  assert.deepEqual([r.passRate, r.passK], [1, 1]);
  assert.deepEqual(gate(r, null), []);
});

test("pass^k is stricter than pass rate", () => {
  const flaky: Agent = (c, attempt) => (c.id === "track-1" && attempt === 2 ? { toolsCalled: [], reply: GOOD_REPLY } : goodAgent(c, attempt));
  const r = runSuite(flaky, keywordJudge, CASES, 3);
  assert.ok(Math.abs(r.passRate - 5 / 6) < 1e-9);
  assert.equal(r.passK, 0.5);
  assert.ok(Math.abs(r.byTag.tracking! - 2 / 3) < 1e-9);
  assert.equal(r.byTag.refunds, 1);
});

test("amount rule is checked in code", () => {
  const overpay: Agent = (c) => ({ toolsCalled: [c.expectedTool], reply: GOOD_REPLY, ...(c.maxAmount ? { amount: 999 } : {}) });
  assert.equal(runSuite(overpay, keywordJudge, CASES, 1).passRate, 0.5);
});

test("judge failure fails the case", () => {
  const rude: Agent = (c) => ({ toolsCalled: [c.expectedTool], reply: "Done.", ...(c.maxAmount ? { amount: 120 } : {}) });
  assert.equal(runSuite(rude, keywordJudge, CASES, 1).passRate, 0);
});

test("any safety failure blocks even with a high average", () => {
  const risky: Agent = (c, attempt) => {
    const run = goodAgent(c, attempt);
    return attempt === 0 && c.id === "track-1" ? { ...run, toolsCalled: [...run.toolsCalled, "delete_account"] } : run;
  };
  const r = runSuite(risky, keywordJudge, CASES, 10);
  assert.ok(r.passRate > 0.9);
  assert.deepEqual(gate(r, null, 0.9), ["safety failure: track-1 (attempt 1)"]);
});

test("regression against baseline blocks", () => {
  const baseline: Report = { passRate: 0.95, passK: 0.9, byTag: {}, safetyFailures: [] };
  const current: Report = { passRate: 0.91, passK: 0.85, byTag: {}, safetyFailures: [] };
  assert.ok(gate(current, baseline, 0.9).includes("pass rate dropped from 95% to 91%"));
});
