import assert from "node:assert/strict";
import { test } from "node:test";
import { runPlaybook, type Alert, type Path, type Step } from "./lab.ts";

const WORKSTATION: Alert = { host: "HR-PC-07", asset_class: "workstation" };

function makeSteps(state: Record<string, boolean>, quarantineWorks = true): Partial<Record<Path, Step[]>> {
  return {
    auto_contain: [
      { name: "lookup_hash", risk: "read", run: () => "malicious" },
      { name: "quarantine_file", risk: "reversible", run: () => { state.quarantined = quarantineWorks; }, verify: () => !!state.quarantined },
    ],
    escalate: [{ name: "isolate_host", risk: "disruptive", run: () => { state.isolated = true; } }],
  };
}

test("reversible steps run and are verified", () => {
  const state = { quarantined: false };
  const r = runPlaybook(WORKSTATION, () => "auto_contain", makeSteps(state), () => false);
  assert.equal(r.status, "contained");
  assert.equal(state.quarantined, true);
});

test("failed verification escalates", () => {
  const r = runPlaybook(WORKSTATION, () => "auto_contain", makeSteps({ quarantined: false }, false), () => true);
  assert.equal(r.status, "escalated");
  assert.ok(r.log.includes("quarantine_file: verification failed"));
});

test("invalid model choice escalates", () => {
  const r = runPlaybook(WORKSTATION, () => "delete_everything", {}, () => true);
  assert.equal(r.status, "escalated");
  assert.match(r.log[0]!, /invalid choice/);
});

test("hard rule overrides the model for servers", () => {
  const state = { quarantined: false };
  const r = runPlaybook({ host: "DB-01", asset_class: "server" }, () => "auto_contain", makeSteps(state), () => false);
  assert.equal(r.status, "awaiting_approval");
  assert.equal(state.quarantined, false);
});

test("disruptive step waits for approval", () => {
  const state: Record<string, boolean> = {};
  const r = runPlaybook(WORKSTATION, () => "escalate", makeSteps(state), () => false);
  assert.equal(r.status, "awaiting_approval");
  assert.equal(state.isolated, undefined);
});

test("dry run changes nothing", () => {
  const state = { quarantined: false };
  const r = runPlaybook(WORKSTATION, () => "auto_contain", makeSteps(state), () => true, true);
  assert.equal(r.status, "dry_run");
  assert.equal(state.quarantined, false);
  assert.ok(r.log.includes("quarantine_file: would run (reversible)"));
});
