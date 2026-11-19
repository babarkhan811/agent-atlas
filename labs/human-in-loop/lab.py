"""An approval gate for AI agent actions.

Every side-effecting action goes through `Gate.request`. Low-risk actions run
immediately; high-impact ones wait for a human approval that is bound to the
exact tool and arguments, single-use and time-limited. Execution uses an
idempotency key and every event is written to an append-only audit log.
"""
from __future__ import annotations

import hashlib
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class Action:
    tool: str
    args: dict[str, Any]

    def digest(self) -> str:
        """Stable fingerprint of tool + arguments."""
        body = json.dumps({"tool": self.tool, "args": self.args}, sort_keys=True)
        return hashlib.sha256(body.encode()).hexdigest()


def needs_approval(action: Action, refund_limit: float = 100) -> bool:
    """Policy lives in code: big refunds and anything irreversible need a person."""
    if action.tool == "issue_refund":
        return float(action.args.get("amount", 0)) > refund_limit
    return action.tool in {"delete_account", "change_payout_details"}


class ApprovalError(Exception):
    pass


class Gate:
    def __init__(self, tools: dict[str, Callable[..., Any]], clock: Callable[[], float] = time.time,
                 ttl_seconds: int = 24 * 3600):
        self.tools, self.clock, self.ttl = tools, clock, ttl_seconds
        self._pending: dict[str, dict] = {}    # request_id -> request
        self._approvals: dict[str, dict] = {}  # approval_id -> approval
        self._log: list[dict] = []

    @property
    def log(self) -> tuple[dict, ...]:
        """Read-only view: callers (including the agent) cannot edit history."""
        return tuple(dict(e) for e in self._log)

    def _record(self, event: str, **fields: Any) -> None:
        self._log.append({"event": event, "at": self.clock(), **fields})

    def request(self, action: Action, requested_by: str) -> dict:
        self._record("requested", tool=action.tool, args=action.args, by=requested_by)
        if not needs_approval(action):
            return {"status": "executed", "result": self._execute(action)}
        request_id = "req_" + secrets.token_hex(4)
        self._pending[request_id] = {"action": action, "by": requested_by}
        self._record("approval_needed", request_id=request_id)
        return {"status": "pending", "request_id": request_id}

    def approve(self, request_id: str, approver: str) -> str:
        req = self._pending.pop(request_id, None)
        if req is None:
            raise ApprovalError("unknown or already decided request")
        if approver == req["by"]:
            raise ApprovalError("requester cannot approve their own action")
        approval_id = "apr_" + secrets.token_hex(4)
        self._approvals[approval_id] = {"digest": req["action"].digest(), "by": approver,
                                        "expires": self.clock() + self.ttl, "used": False}
        self._record("approved", request_id=request_id, approval_id=approval_id, by=approver)
        return approval_id

    def execute(self, action: Action, approval_id: str) -> Any:
        approval = self._approvals.get(approval_id)
        if approval is None:
            raise ApprovalError("unknown approval")
        if approval["used"]:
            raise ApprovalError("approval already used")
        if self.clock() > approval["expires"]:
            raise ApprovalError("approval expired")
        if approval["digest"] != action.digest():
            raise ApprovalError("action does not match what was approved")
        approval["used"] = True  # consume before running, so a second attempt fails
        return self._execute(action, approval_id=approval_id)

    def _execute(self, action: Action, **fields: Any) -> Any:
        key = f"{action.tool}-{action.digest()[:12]}"  # same action -> same idempotency key
        result = self.tools[action.tool](idempotency_key=key, **action.args)
        self._record("executed", tool=action.tool, args=action.args, result=result, **fields)
        return result


class FakePayments:
    """Pretend payments API that honours idempotency keys."""

    def __init__(self):
        self.calls, self.seen = 0, {}

    def issue_refund(self, idempotency_key: str, order_id: str, amount: float, currency: str) -> str:
        if idempotency_key in self.seen:
            return self.seen[idempotency_key]
        self.calls += 1
        result = f"refund of {amount} {currency} for {order_id} issued"
        self.seen[idempotency_key] = result
        return result


if __name__ == "__main__":
    payments = FakePayments()
    gate = Gate({"issue_refund": payments.issue_refund})
    refund = Action("issue_refund", {"order_id": "A-5521", "amount": 450, "currency": "USD"})
    pending = gate.request(refund, requested_by="support-agent")
    print(pending["status"])  # pending
    approval = gate.approve(pending["request_id"], approver="manager@shop.example")
    print(gate.execute(refund, approval))
    print(len(gate.log), "audit entries")
