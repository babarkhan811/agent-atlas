import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE, prioritise, rank, severityBand, type Finding } from "./lab.ts";

test("severity bands follow the CVSS scale", () => {
  assert.deepEqual([0, 0.1, 3.9, 4.0, 6.9, 7.0, 8.9, 9.0, 10].map(severityBand),
    ["None", "Low", "Low", "Medium", "Medium", "High", "High", "Critical", "Critical"]);
});

test("reachable internet-facing High is P1", () => {
  assert.equal(prioritise(SAMPLE[0]!).priority, "P1");
});

test("unreachable Critical is not P1", () => {
  const r = prioritise(SAMPLE[1]!);
  assert.equal(r.priority, "P3");
  assert.ok(r.reasons.includes("vulnerable code not reachable (re-check when code changes)"));
});

test("KEV with unknown reachability is urgent", () => {
  assert.equal(prioritise(SAMPLE[2]!).priority, "P1");
});

test("ranking order", () => {
  assert.deepEqual(rank(SAMPLE).map((r) => r.finding.cve.slice(0, 13)), ["CVE-2026-0001", "CVE-2026-0003", "CVE-2026-0002", "CVE-2026-0004"]);
});

test("rejects out-of-range inputs", () => {
  const base: Finding = { cve: "x", pkg: "y", cvss: 5, kev: false, epss: 0.1, reachable: true, exposure: "internet" };
  assert.throws(() => prioritise({ ...base, cvss: 11 }), RangeError);
  assert.throws(() => prioritise({ ...base, epss: 1.5 }), RangeError);
  assert.throws(() => prioritise({ ...base, exposure: "cloud" as never }), RangeError);
});
