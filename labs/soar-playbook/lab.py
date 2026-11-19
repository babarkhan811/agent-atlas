"""A small playbook runner with risk-tagged steps.

- The AI decision step may only return one of the allowed paths; anything
  else, or a hard rule such as "servers always escalate", forces escalation.
- Read-only and reversible steps run automatically; disruptive steps need
  approval. Every action can be verified, and a failed check escalates.
- dry_run=True logs what would happen without changing anything.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

READ, REVERSIBLE, DISRUPTIVE = "read", "reversible", "disruptive"
PATHS = ("auto_contain", "escalate", "close_benign")


@dataclass
class Step:
    name: str
    risk: str
    run: Callable[[dict], object]
    verify: Callable[[dict], bool] | None = None


def choose_path(alert: dict, decide: Callable[[dict], str]) -> tuple[str, str]:
    """Returns (path, reason). Hard rules in code override the model."""
    if alert.get("asset_class") in ("server", "executive"):
        return "escalate", "rule: sensitive asset"
    choice = decide(alert)
    if choice not in PATHS:
        return "escalate", f"invalid choice {choice!r}"
    return choice, "model"


def run_playbook(alert: dict, decide: Callable[[dict], str], steps: dict[str, list[Step]],
                 approve: Callable[[Step, dict], bool], dry_run: bool = False) -> dict:
    path, reason = choose_path(alert, decide)
    log: list[str] = [f"path={path} ({reason})"]
    for step in steps.get(path, []):
        if step.risk == DISRUPTIVE and not approve(step, alert):
            log.append(f"{step.name}: waiting for approval")
            return {"status": "awaiting_approval", "log": log}
        if dry_run:
            log.append(f"{step.name}: would run ({step.risk})")
            continue
        try:
            step.run(alert)
        except Exception as e:
            log.append(f"{step.name}: failed: {e}")
            return {"status": "escalated", "log": log}
        if step.verify and not step.verify(alert):
            log.append(f"{step.name}: verification failed")
            return {"status": "escalated", "log": log}
        log.append(f"{step.name}: done ({step.risk})")
    status = {"auto_contain": "contained", "close_benign": "closed", "escalate": "escalated"}[path]
    return {"status": "dry_run" if dry_run else status, "log": log}


if __name__ == "__main__":
    state = {"quarantined": False}
    steps = {"auto_contain": [
        Step("lookup_hash", READ, lambda a: "malicious"),
        Step("quarantine_file", REVERSIBLE, lambda a: state.update(quarantined=True), lambda a: state["quarantined"]),
    ]}
    result = run_playbook({"host": "HR-PC-07", "asset_class": "workstation"}, lambda a: "auto_contain", steps,
                          approve=lambda s, a: False)
    print(result)
