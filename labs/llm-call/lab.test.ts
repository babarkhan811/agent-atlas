import assert from "node:assert/strict";
import { test } from "node:test";
import { TruncatedReply, collect, fakeStream, requireComplete } from "./lab.ts";

test("assembles text and usage", () => {
  const reply = collect(fakeStream("Hello there friend", "end_turn", 12));
  assert.equal(reply.text, "Hello there friend");
  assert.deepEqual([reply.inputTokens, reply.outputTokens], [12, 3]);
  assert.equal(requireComplete(reply), "Hello there friend");
});

test("a truncated reply is not treated as finished", () => {
  const reply = collect(fakeStream("This answer was cut", "max_tokens"));
  assert.equal(reply.complete, false);
  assert.throws(() => requireComplete(reply), TruncatedReply);
});

test("a broken stream is an error", () => {
  const events = [...fakeStream("never finished")].slice(0, -2);
  assert.throws(() => collect(events), /ended before message_stop/);
});

test("an error event raises", () => {
  const events = [{ type: "message_start", message: { usage: { input_tokens: 1 } } }, { type: "error", error: { message: "overloaded" } }];
  assert.throws(() => collect(events), /overloaded/);
});
