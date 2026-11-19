import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { ApprovalError, FakePayments, Gate, type Action } from "./lab.ts";

const refund = (amount: number, order = "A-5521"): Action => ({ tool: "issue_refund", args: { order_id: order, amount, currency: "USD" } });

let now: number, payments: FakePayments, gate: Gate;
beforeEach(() => {
  now = 1000;
  payments = new FakePayments();
  gate = new Gate({ issue_refund: payments.issueRefund }, () => now, 60);
});

function approved(action: Action): string {
  const pending = gate.request(action, "agent");
  assert.equal(pending.status, "pending");
  return gate.approve((pending as { requestId: string }).requestId, "manager");
}

test("small refund runs without approval", () => {
  assert.equal(gate.request(refund(40), "agent").status, "executed");
  assert.equal(payments.calls, 1);
});

test("large refund waits, then runs once", () => {
  const approval = approved(refund(450));
  assert.equal(payments.calls, 0);
  gate.execute(refund(450), approval);
  assert.equal(payments.calls, 1);
});

test("approval is single-use", () => {
  const approval = approved(refund(450));
  gate.execute(refund(450), approval);
  assert.throws(() => gate.execute(refund(450), approval), /already used/);
});

test("approval is bound to exact arguments", () => {
  const approval = approved(refund(450));
  assert.throws(() => gate.execute(refund(4500), approval), /does not match/);
  assert.equal(payments.calls, 0);
});

test("approval expires", () => {
  const approval = approved(refund(450));
  now += 61;
  assert.throws(() => gate.execute(refund(450), approval), /expired/);
});

test("requester cannot self-approve", () => {
  const pending = gate.request(refund(450), "agent") as { requestId: string };
  assert.throws(() => gate.approve(pending.requestId, "agent"), ApprovalError);
});

test("idempotency key prevents double payment", () => {
  gate.request(refund(40), "agent");
  gate.request(refund(40), "agent"); // e.g. a retry after a timeout
  assert.equal(payments.calls, 1);
});

test("audit log is complete and read-only", () => {
  const approval = approved(refund(450));
  gate.execute(refund(450), approval);
  assert.deepEqual(gate.log.map((e) => e.event), ["requested", "approval_needed", "approved", "executed"]);
  gate.log[0]!.event = "tampered";
  assert.equal(gate.log[0]!.event, "requested");
});
