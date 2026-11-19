// A2A (v1.0) task lifecycle and Agent Card checks, simplified for learning.
//
// Task: a state machine using the v1.0 TaskState names. Terminal states never
// change; follow-up work starts a new task that references the old one. The
// transition table is a teaching simplification, not a normative table.
// validateCard checks the Agent Card fields this lesson relies on, and
// chooseInterface picks the first interface the client can speak.
// Run with: node lab.ts

export type TaskState =
  | "TASK_STATE_SUBMITTED" | "TASK_STATE_WORKING" | "TASK_STATE_INPUT_REQUIRED" | "TASK_STATE_AUTH_REQUIRED"
  | "TASK_STATE_COMPLETED" | "TASK_STATE_FAILED" | "TASK_STATE_CANCELED" | "TASK_STATE_REJECTED";

export const TERMINAL = new Set<TaskState>(["TASK_STATE_COMPLETED", "TASK_STATE_FAILED", "TASK_STATE_CANCELED", "TASK_STATE_REJECTED"]);
const ALLOWED: Partial<Record<TaskState, TaskState[]>> = {
  TASK_STATE_SUBMITTED: ["TASK_STATE_WORKING", "TASK_STATE_REJECTED", "TASK_STATE_CANCELED", "TASK_STATE_FAILED"],
  TASK_STATE_WORKING: ["TASK_STATE_INPUT_REQUIRED", "TASK_STATE_AUTH_REQUIRED", "TASK_STATE_COMPLETED", "TASK_STATE_FAILED", "TASK_STATE_CANCELED"],
  TASK_STATE_INPUT_REQUIRED: ["TASK_STATE_WORKING", "TASK_STATE_CANCELED", "TASK_STATE_FAILED"],
  TASK_STATE_AUTH_REQUIRED: ["TASK_STATE_WORKING", "TASK_STATE_CANCELED", "TASK_STATE_FAILED"],
};
const BINDINGS = new Set(["JSONRPC", "GRPC", "HTTP+JSON"]);

export type Part = { text?: string; data?: unknown; url?: string; raw?: string };
export type Artifact = { artifactId: string; name: string; parts: Part[] };
export type AgentCard = {
  name?: string;
  description?: string;
  supportedInterfaces?: { url?: string; protocolBinding?: string; protocolVersion?: string }[];
  capabilities?: Record<string, unknown>;
  skills?: { id?: string; name?: string; description?: string; tags?: string[] }[];
};

export class InvalidTransition extends Error {}
let counter = 0;

export class Task {
  id: string;
  contextId: string;
  state: TaskState = "TASK_STATE_SUBMITTED";
  history: TaskState[] = ["TASK_STATE_SUBMITTED"];
  artifacts: Artifact[] = [];
  referenceTaskIds: string[];

  constructor(contextId: string, referenceTaskIds: string[] = []) {
    this.id = `task-${++counter}`;
    this.contextId = contextId;
    this.referenceTaskIds = referenceTaskIds;
  }

  move(next: TaskState): void {
    if (TERMINAL.has(this.state)) throw new InvalidTransition(`${this.id} is ${this.state}; terminal tasks are immutable`);
    if (!(ALLOWED[this.state] ?? []).includes(next)) throw new InvalidTransition(`${this.state} -> ${next} is not allowed`);
    this.state = next;
    this.history.push(next);
  }

  addArtifact(artifactId: string, name: string, parts: Part[]): void {
    if (TERMINAL.has(this.state)) throw new InvalidTransition("cannot add artifacts to a finished task");
    if (parts.length === 0) throw new Error("an artifact needs at least one part");
    if (this.artifacts.some((a) => a.artifactId === artifactId)) throw new Error("artifactId must be unique within the task");
    this.artifacts.push({ artifactId, name, parts });
  }

  /** Follow-up work on a finished task becomes a new task in the same context. */
  refine(): Task {
    if (!TERMINAL.has(this.state)) throw new InvalidTransition("continue an unfinished task with its taskId instead");
    return new Task(this.contextId, [this.id]);
  }
}

export function validateCard(card: AgentCard): string[] {
  const problems = (["name", "description", "supportedInterfaces", "skills"] as const)
    .filter((k) => { const v = card[k]; return !v || (Array.isArray(v) && v.length === 0); })
    .map((k) => `missing ${k}`);
  (card.supportedInterfaces ?? []).forEach((iface, i) => {
    if (!String(iface.url ?? "").startsWith("https://")) problems.push(`supportedInterfaces[${i}].url must be https`);
    if (!BINDINGS.has(iface.protocolBinding ?? "")) problems.push(`supportedInterfaces[${i}].protocolBinding must be one of ${[...BINDINGS].sort().join(", ")}`);
  });
  (card.skills ?? []).forEach((skill, i) => {
    for (const k of ["id", "name", "description"] as const) if (!skill[k]) problems.push(`skills[${i}] missing ${k}`);
  });
  for (const [k, v] of Object.entries(card.capabilities ?? {})) if (typeof v !== "boolean") problems.push(`capabilities.${k} must be true or false`);
  return problems;
}

export function chooseInterface(card: AgentCard, preferences: string[]) {
  for (const binding of preferences) {
    const match = (card.supportedInterfaces ?? []).find((i) => i.protocolBinding === binding);
    if (match) return match;
  }
  return null;
}

if (import.meta.main) {
  const task = new Task("ctx-lisbon-trip");
  for (const s of ["TASK_STATE_WORKING", "TASK_STATE_INPUT_REQUIRED", "TASK_STATE_WORKING"] as const) task.move(s);
  task.addArtifact("art-1", "booking-confirmation", [{ data: { hotel: "Mar Azul", total_eur: 344 } }]);
  task.move("TASK_STATE_COMPLETED");
  console.log(task.history, JSON.stringify(task.artifacts));
}
