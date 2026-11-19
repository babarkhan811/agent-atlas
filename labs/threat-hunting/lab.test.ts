import assert from "node:assert/strict";
import { test } from "node:test";
import { detectBeacons, seeded, type Connection } from "./lab.ts";

const rnd = seeded(42);
const beacon = (src: string, dest: string, period: number, jitter: number, n = 100): Connection[] =>
  Array.from({ length: n }, (_, i) => [src, dest, i * period + (rnd() * 2 - 1) * jitter] as Connection);
function browsing(src: string, dest: string, meanGap: number, n = 100): Connection[] {
  let t = 0;
  return Array.from({ length: n }, () => { t += -Math.log(1 - rnd()) * meanGap; return [src, dest, t] as Connection; });
}

test("finds a jittered beacon", () => {
  const found = detectBeacons(beacon("DEV-SRV-03", "198.51.100.23", 60, 4));
  assert.equal(found.length, 1);
  assert.equal(found[0]!.dest, "198.51.100.23");
  assert.ok(Math.abs(found[0]!.meanInterval - 60) < 2);
});

test("ignores irregular human traffic", () => {
  assert.deepEqual(detectBeacons(browsing("HR-PC-07", "news.example", 90)), []);
});

test("allowlist excludes known benign timers", () => {
  const conns = beacon("HR-PC-07", "updates.vendor.example", 300, 10);
  assert.equal(detectBeacons(conns).length, 1);
  assert.deepEqual(detectBeacons(conns, 20, 0.15, new Set(["HR-PC-07|updates.vendor.example"])), []);
});

test("too few connections is not enough evidence", () => {
  assert.deepEqual(detectBeacons(beacon("A", "B", 60, 1, 5)), []);
});

test("most regular first in mixed traffic", () => {
  const found = detectBeacons([...beacon("A", "c2.example", 60, 1), ...beacon("B", "sync.example", 120, 15), ...browsing("C", "web.example", 60)]);
  assert.deepEqual(found.map((f) => f.dest), ["c2.example", "sync.example"]);
});
