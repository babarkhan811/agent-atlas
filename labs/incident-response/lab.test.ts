import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE, buildTimeline, openQuestions } from "./lab.ts";

test("orders events by time", () => {
  assert.deepEqual(buildTimeline(SAMPLE, "corp.example").map((x) => x.action), ["sign-in", "mfa-method-added", "inbox-rule-created"]);
});

test("flags outside forwarding but not internal", () => {
  const timeline = buildTimeline([
    { time: "2026-11-19T01:00:00+00:00", source: "mail", action: "inbox-rule-created", detail: { forward_to: "boss@corp.example" } },
    { time: "2026-11-19T01:05:00+00:00", source: "mail", action: "inbox-rule-created", detail: { forward_to: "x@example.net" } },
  ], "corp.example");
  assert.deepEqual(timeline[0]!.flags, []);
  assert.match(timeline[1]!.flags[0]!, /T1114\.003/);
});

test("flags unconfirmed MFA devices only", () => {
  const mfa = buildTimeline(SAMPLE, "corp.example").find((x) => x.action === "mfa-method-added")!;
  assert.match(mfa.flags[0]!, /T1098\.005/);
  const confirmed = buildTimeline([{ time: "2026-11-19T01:00:00+00:00", source: "identity", action: "mfa-method-added", detail: { by_user_confirmed: true } }], "corp.example");
  assert.deepEqual(confirmed[0]!.flags, []);
});

test("open questions", () => {
  const q = openQuestions(buildTimeline(SAMPLE, "corp.example"));
  assert.ok(q.includes("Do any other mailboxes forward to example.net?"));
  assert.ok(q.includes("Did any other account sign in from 203.0.113.50?"));
  assert.ok(q.some((x) => x.includes("file auditing")));
});
