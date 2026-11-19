"""An agent loop with budgets and loop detection, provider-neutral.

The runtime drives a model through tool calls and stops for one of four
reasons: the model finished, the turn budget ran out, the token budget ran
out, or the agent kept repeating the same call. Plug in any LLM client by
implementing `Model.respond`.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class Turn:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    tokens: int = 0  # tokens this model call consumed (input + output)


class Model(Protocol):
    def respond(self, messages: list[dict]) -> Turn: ...


@dataclass
class Budget:
    max_turns: int = 10
    max_tokens: int = 50_000
    max_repeats: int = 3  # identical (tool, input) calls allowed before we stop


@dataclass
class RunResult:
    stop: str            # "done", "max_turns", "max_tokens" or "loop_detected"
    answer: str
    turns: int
    tokens: int
    calls: list[str]


def call_key(call: ToolCall) -> str:
    """Tool name plus canonical JSON input, so argument order doesn't matter."""
    return call.name + ":" + json.dumps(call.input, sort_keys=True)


def run(model: Model, tools: dict[str, Callable[..., Any]], goal: str, budget: Budget = Budget()) -> RunResult:
    messages: list[dict] = [{"role": "user", "content": goal}]
    tokens, seen, calls = 0, {}, []
    for turn_no in range(1, budget.max_turns + 1):
        turn = model.respond(messages)
        tokens += turn.tokens
        if tokens > budget.max_tokens:
            return RunResult("max_tokens", "", turn_no, tokens, calls)
        if not turn.tool_calls:
            return RunResult("done", turn.text, turn_no, tokens, calls)
        results = []
        for call in turn.tool_calls:
            key = call_key(call)
            seen[key] = seen.get(key, 0) + 1
            if seen[key] > budget.max_repeats:
                return RunResult("loop_detected", "", turn_no, tokens, calls)
            calls.append(call.name)
            fn = tools.get(call.name)
            try:
                content, is_error = (str(fn(**call.input)), False) if fn else (f"unknown tool '{call.name}'", True)
            except Exception as e:
                content, is_error = f"{call.name} failed: {e}", True
            results.append({"tool_use_id": call.id, "content": content, "is_error": is_error})
        messages.append({"role": "assistant", "tool_calls": [c.__dict__ for c in turn.tool_calls]})
        messages.append({"role": "user", "content": results})
    return RunResult("max_turns", "", budget.max_turns, tokens, calls)


if __name__ == "__main__":
    class Demo:
        def respond(self, messages):
            if len(messages) == 1:
                return Turn(tool_calls=[ToolCall("t1", "list_issues", {"state": "open"})], tokens=1200)
            return Turn(text=f"Report: {messages[-1]['content'][0]['content']}", tokens=2600)

    result = run(Demo(), {"list_issues": lambda state: "12 open bugs"}, "Summarise open bugs")
    print(result.stop, "|", result.answer, "|", result.turns, "turns,", result.tokens, "tokens")
