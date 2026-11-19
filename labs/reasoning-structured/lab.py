"""Validate structured model output and retry once with the exact error.

Provider-neutral: implement `Model.respond` with any LLM client that supports
structured outputs. The schema check is deliberately repeated in code even
when the provider enforces it, and business rules use TRUSTED data (the real
order), never values the model claims.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Protocol

CATEGORIES = ["billing", "technical", "delivery", "account", "other"]
PRIORITIES = ["low", "normal", "high", "urgent"]

# A small subset of JSON Schema: types, required fields, enums, no extra keys.
TICKET_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["category", "priority", "refund_requested", "refund_amount_gbp", "summary"],
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "priority": {"type": "string", "enum": PRIORITIES},
        "refund_requested": {"type": "boolean"},
        "refund_amount_gbp": {"type": "number"},
        "summary": {"type": "string"},
    },
}

PY_TYPES = {"string": str, "boolean": bool, "number": (int, float), "object": dict}


def schema_errors(obj: Any, schema: dict = TICKET_SCHEMA) -> list[str]:
    if not isinstance(obj, dict):
        return ["answer is not a JSON object"]
    errors = [f"missing field '{k}'" for k in schema["required"] if k not in obj]
    if schema.get("additionalProperties") is False:
        errors += [f"unexpected field '{k}'" for k in obj if k not in schema["properties"]]
    for key, rule in schema["properties"].items():
        if key not in obj:
            continue
        value = obj[key]
        expected = PY_TYPES[rule["type"]]
        # bool is a subclass of int in Python: don't accept True as a number.
        if not isinstance(value, expected) or (rule["type"] == "number" and isinstance(value, bool)):
            errors.append(f"'{key}' must be {rule['type']}")
        elif "enum" in rule and value not in rule["enum"]:
            errors.append(f"'{key}' must be one of {rule['enum']}")
    return errors


def rule_errors(ticket: dict, order_total_gbp: float) -> list[str]:
    errors = []
    if ticket["refund_amount_gbp"] < 0:
        errors.append("refund_amount_gbp must not be negative")
    if ticket["refund_amount_gbp"] > order_total_gbp:
        errors.append(f"refund_amount_gbp must not exceed order total {order_total_gbp:g}")
    if not ticket["refund_requested"] and ticket["refund_amount_gbp"] != 0:
        errors.append("refund_amount_gbp must be 0 when no refund is requested")
    return errors


@dataclass
class Reply:
    text: str
    stop_reason: str = "end_turn"  # also: "max_tokens", "refusal"


class Model(Protocol):
    def respond(self, messages: list[dict]) -> Reply: ...


@dataclass
class Outcome:
    status: str                      # "ok" or "needs_human"
    ticket: dict | None
    attempts: int
    errors: list[str] = field(default_factory=list)


def extract_ticket(model: Model, email: str, order_total_gbp: float, max_attempts: int = 2) -> Outcome:
    messages = [{"role": "user", "content": email}]
    errors: list[str] = []
    for attempt in range(1, max_attempts + 1):
        reply = model.respond(messages)
        if reply.stop_reason == "refusal":
            return Outcome("needs_human", None, attempt, ["model refused"])
        if reply.stop_reason == "max_tokens":
            errors = ["answer was cut off at the output limit"]
        else:
            try:
                ticket = json.loads(reply.text)
                errors = schema_errors(ticket) or rule_errors(ticket, order_total_gbp)
            except json.JSONDecodeError:
                errors = ["answer is not valid JSON"]
            if not errors:
                return Outcome("ok", ticket, attempt)
        messages += [{"role": "assistant", "content": reply.text},
                     {"role": "user", "content": "Fix these problems and answer again: " + "; ".join(errors)}]
    return Outcome("needs_human", None, max_attempts, errors)


if __name__ == "__main__":
    class Demo:
        def __init__(self):
            self.answers = [
                '{"category":"billing","priority":"high","refund_requested":true,"refund_amount_gbp":178,"summary":"Charged twice"}',
                '{"category":"billing","priority":"high","refund_requested":true,"refund_amount_gbp":89,"summary":"Charged twice"}',
            ]

        def respond(self, messages):
            return Reply(self.answers.pop(0))

    print(extract_ticket(Demo(), "Charged twice for order A-5521", order_total_gbp=89))
