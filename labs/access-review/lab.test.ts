import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCOUNTS, EMPLOYEES, TODAY, review } from "./lab.ts";

test("sample findings in risk order", () => {
  assert.deepEqual(review(ACCOUNTS, EMPLOYEES, TODAY).map((i) => [i.kind, i.account]), [
    ["leaver_active", "s.khan"],
    ["unused_privileged", "j.lee"],
    ["mover_old_access", "m.ali"],
    ["orphaned", "svc-report"],
  ]);
});

test("unused-days threshold", () => {
  const recent = { id: "a", employeeId: "e1", grants: [{ app: "billing", role: "admin", privileged: true, lastUsed: "2026-11-01" }] };
  assert.deepEqual(review([recent], EMPLOYEES, TODAY), []);
  assert.equal(review([recent], EMPLOYEES, TODAY, 10)[0]!.kind, "unused_privileged");
});

test("never-used admin is flagged", () => {
  const never = { id: "b", employeeId: "e1", grants: [{ app: "billing", role: "admin", privileged: true }] };
  assert.match(review([never], EMPLOYEES, TODAY)[0]!.reason, /never used/);
});

test("disabled leaver is not flagged", () => {
  assert.deepEqual(review([{ id: "c", employeeId: "e3", enabled: false }], EMPLOYEES, TODAY), []);
});

test("matches on IDs, not names", () => {
  assert.equal(review([{ id: "x", employeeId: "e1" }], [{ employeeId: "e9", team: "Finance", status: "active" }], TODAY)[0]!.kind, "orphaned");
});
