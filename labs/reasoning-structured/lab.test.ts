import assert from "node:assert/strict";
import { test } from "node:test";
import { extractTicket, ruleErrors, schemaErrors, type Message, type Model, type Reply, type Ticket } from "./lab.ts";

const GOOD: Ticket = { category: "billing", priority: "high", refund_requested: true, refund_amount_gbp: 89, summary: "Charged twice" };
const answer = (changes: Partial<Ticket> = {}) => JSON.stringify({ ...GOOD, ...changes });

function scripted(replies: Reply[]) {
  const seen: Message[][] = [];
  const model: Model = { async respond(messages) { seen.push([...messages]); return replies.shift()!; } };
  return { model, seen };
}

test("valid first time", async () => {
  const out = await extractTicket(scripted([{ text: answer() }]).model, "email", 89);
  assert.deepEqual([out.status, out.attempts, out.ticket?.refund_amount_gbp], ["ok", 1, 89]);
});

test("business rule failure is fed back and fixed", async () => {
  const s = scripted([{ text: answer({ refund_amount_gbp: 178 }) }, { text: answer() }]);
  const out = await extractTicket(s.model, "email", 89);
  assert.deepEqual([out.status, out.attempts], ["ok", 2]);
  assert.match(s.seen[1]!.at(-1)!.content, /must not exceed order total 89/);
});

test("gives up after the retry cap", async () => {
  const s = scripted([{ text: answer({ refund_amount_gbp: 178 }) }, { text: answer({ refund_amount_gbp: 150 }) }]);
  const out = await extractTicket(s.model, "email", 89);
  assert.deepEqual([out.status, out.attempts], ["needs_human", 2]);
});

test("schema catches shape problems", () => {
  const { summary: _s, ...rest } = GOOD;
  const errors = schemaErrors({ ...rest, category: "Billing!!", extra: 1 });
  assert.ok(errors.includes("missing field 'summary'"));
  assert.ok(errors.includes("unexpected field 'extra'"));
  assert.ok(errors.some((e) => e.includes("category")));
  assert.ok(schemaErrors({ ...GOOD, refund_amount_gbp: true }).includes("'refund_amount_gbp' must be number"));
  assert.ok(schemaErrors({ ...GOOD, toString: "x" }).includes("unexpected field 'toString'"));
});

test("invalid JSON and truncation are retried", async () => {
  const s = scripted([{ text: "{not json" }, { text: answer().slice(0, 20), stopReason: "max_tokens" }]);
  const out = await extractTicket(s.model, "email", 89);
  assert.equal(out.status, "needs_human");
  assert.match(s.seen[1]!.at(-1)!.content, /not valid JSON/);
  assert.deepEqual(out.errors, ["answer was cut off at the output limit"]);
});

test("refusal goes straight to a human", async () => {
  const out = await extractTicket(scripted([{ text: "", stopReason: "refusal" }]).model, "email", 89);
  assert.deepEqual([out.status, out.attempts], ["needs_human", 1]);
});

test("no refund means zero amount", () => {
  assert.ok(ruleErrors({ ...GOOD, refund_requested: false, refund_amount_gbp: 10 }, 89).length > 0);
});
