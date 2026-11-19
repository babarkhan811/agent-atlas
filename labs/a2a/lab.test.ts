import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidTransition, Task, chooseInterface, validateCard, type AgentCard } from "./lab.ts";

const CARD: AgentCard = {
  name: "Hotel booking agent",
  description: "Searches and books rooms",
  supportedInterfaces: [
    { url: "https://hotels.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "https://hotels.example.com/a2a/rest", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" },
  ],
  capabilities: { streaming: true, pushNotifications: true },
  skills: [{ id: "book-hotel", name: "Book a hotel", description: "Find and book rooms", tags: ["travel"] }],
};

test("happy path with input-required", () => {
  const t = new Task("ctx");
  for (const s of ["TASK_STATE_WORKING", "TASK_STATE_INPUT_REQUIRED", "TASK_STATE_WORKING", "TASK_STATE_COMPLETED"] as const) t.move(s);
  assert.deepEqual(t.history, ["TASK_STATE_SUBMITTED", "TASK_STATE_WORKING", "TASK_STATE_INPUT_REQUIRED", "TASK_STATE_WORKING", "TASK_STATE_COMPLETED"]);
});

test("terminal tasks are immutable", () => {
  const t = new Task("ctx");
  t.move("TASK_STATE_WORKING");
  t.move("TASK_STATE_COMPLETED");
  assert.throws(() => t.move("TASK_STATE_WORKING"), InvalidTransition);
  assert.throws(() => t.addArtifact("art-2", "late", [{ text: "too late" }]), InvalidTransition);
});

test("illegal jump", () => {
  assert.throws(() => new Task("ctx").move("TASK_STATE_INPUT_REQUIRED"), InvalidTransition);
});

test("refinement creates a new task in the same context", () => {
  const t = new Task("ctx-trip");
  t.move("TASK_STATE_WORKING");
  t.move("TASK_STATE_CANCELED");
  const followUp = t.refine();
  assert.notEqual(followUp.id, t.id);
  assert.equal(followUp.contextId, "ctx-trip");
  assert.deepEqual(followUp.referenceTaskIds, [t.id]);
});

test("cannot refine an unfinished task", () => {
  assert.throws(() => new Task("ctx").refine(), InvalidTransition);
});

test("artifacts need parts and unique ids", () => {
  const t = new Task("ctx");
  t.move("TASK_STATE_WORKING");
  t.addArtifact("art-1", "booking-confirmation", [{ data: { ref: "MA-55120" } }]);
  assert.throws(() => t.addArtifact("art-1", "dup", [{ text: "x" }]));
  assert.throws(() => t.addArtifact("art-2", "empty", []));
});

test("valid card", () => assert.deepEqual(validateCard(CARD), []));

test("card problems are listed", () => {
  const problems = validateCard({
    name: "x",
    supportedInterfaces: [{ url: "http://x", protocolBinding: "SOAP" }],
    skills: [{ id: "s" }],
    capabilities: { streaming: "yes" },
  });
  assert.ok(problems.includes("missing description"));
  assert.ok(problems.includes("supportedInterfaces[0].url must be https"));
  assert.ok(problems.some((p) => p.includes("protocolBinding")));
  assert.ok(problems.includes("skills[0] missing name"));
  assert.ok(problems.includes("capabilities.streaming must be true or false"));
});

test("chooseInterface respects preferences", () => {
  assert.equal(chooseInterface(CARD, ["GRPC", "HTTP+JSON"])?.protocolBinding, "HTTP+JSON");
  assert.equal(chooseInterface(CARD, ["GRPC"]), null);
});
