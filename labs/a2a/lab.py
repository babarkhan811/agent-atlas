"""A2A (v1.0) task lifecycle and Agent Card checks, simplified for learning.

- Task: state machine using the v1.0 TaskState names. Terminal states
  (COMPLETED, FAILED, CANCELED, REJECTED) never change; follow-up work starts a
  new task that references the old one. The transition table is a teaching
  simplification, not a normative table from the specification.
- validate_card: checks the Agent Card fields this lesson relies on.
- choose_interface: picks the first supported interface the client can speak.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass, field

P = "TASK_STATE_"
SUBMITTED, WORKING, INPUT_REQUIRED, AUTH_REQUIRED = P + "SUBMITTED", P + "WORKING", P + "INPUT_REQUIRED", P + "AUTH_REQUIRED"
COMPLETED, FAILED, CANCELED, REJECTED = P + "COMPLETED", P + "FAILED", P + "CANCELED", P + "REJECTED"
TERMINAL = {COMPLETED, FAILED, CANCELED, REJECTED}
INTERRUPTED = {INPUT_REQUIRED, AUTH_REQUIRED}
ALLOWED = {
    SUBMITTED: {WORKING, REJECTED, CANCELED, FAILED},
    WORKING: {INPUT_REQUIRED, AUTH_REQUIRED, COMPLETED, FAILED, CANCELED},
    INPUT_REQUIRED: {WORKING, CANCELED, FAILED},
    AUTH_REQUIRED: {WORKING, CANCELED, FAILED},
}
BINDINGS = {"JSONRPC", "GRPC", "HTTP+JSON"}
_ids = itertools.count(1)


class InvalidTransition(Exception):
    pass


@dataclass
class Task:
    context_id: str
    id: str = field(default_factory=lambda: f"task-{next(_ids)}")
    state: str = SUBMITTED
    artifacts: list[dict] = field(default_factory=list)
    history: list[str] = field(default_factory=lambda: [SUBMITTED])
    reference_task_ids: list[str] = field(default_factory=list)

    def move(self, new_state: str) -> None:
        if self.state in TERMINAL:
            raise InvalidTransition(f"{self.id} is {self.state}; terminal tasks are immutable")
        if new_state not in ALLOWED[self.state]:
            raise InvalidTransition(f"{self.state} -> {new_state} is not allowed")
        self.state = new_state
        self.history.append(new_state)

    def add_artifact(self, artifact_id: str, name: str, parts: list[dict]) -> None:
        if self.state in TERMINAL:
            raise InvalidTransition("cannot add artifacts to a finished task")
        if not parts:
            raise ValueError("an artifact needs at least one part")
        if any(a["artifactId"] == artifact_id for a in self.artifacts):
            raise ValueError("artifactId must be unique within the task")
        self.artifacts.append({"artifactId": artifact_id, "name": name, "parts": parts})

    def refine(self) -> "Task":
        """Follow-up work on a finished task becomes a new task in the same context."""
        if self.state not in TERMINAL:
            raise InvalidTransition("continue an unfinished task with its taskId instead")
        return Task(context_id=self.context_id, reference_task_ids=[self.id])


def validate_card(card: dict) -> list[str]:
    problems = [f"missing {k}" for k in ("name", "description", "supportedInterfaces", "skills") if not card.get(k)]
    for i, iface in enumerate(card.get("supportedInterfaces") or []):
        if not str(iface.get("url", "")).startswith("https://"):
            problems.append(f"supportedInterfaces[{i}].url must be https")
        if iface.get("protocolBinding") not in BINDINGS:
            problems.append(f"supportedInterfaces[{i}].protocolBinding must be one of {sorted(BINDINGS)}")
    for i, skill in enumerate(card.get("skills") or []):
        problems += [f"skills[{i}] missing {k}" for k in ("id", "name", "description") if not skill.get(k)]
    caps = card.get("capabilities") or {}
    problems += [f"capabilities.{k} must be true or false" for k, v in caps.items() if not isinstance(v, bool)]
    return problems


def choose_interface(card: dict, preferences: list[str]) -> dict | None:
    by_binding = {i.get("protocolBinding"): i for i in card.get("supportedInterfaces") or []}
    return next((by_binding[b] for b in preferences if b in by_binding), None)


if __name__ == "__main__":
    task = Task(context_id="ctx-lisbon-trip")
    for s in (WORKING, INPUT_REQUIRED, WORKING):
        task.move(s)
    task.add_artifact("art-1", "booking-confirmation", [{"data": {"hotel": "Mar Azul", "total_eur": 344}}])
    task.move(COMPLETED)
    print(task.history, task.artifacts)
