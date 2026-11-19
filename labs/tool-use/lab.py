"""A safe tool-calling loop, provider-neutral.

The model only *requests* tools. This loop validates each request against a
registry and schema, runs it, returns errors as data instead of crashing,
returns parallel results together, and stops after a fixed number of rounds.
Plug in any LLM client by implementing `Model.respond`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Protocol


@dataclass
class Tool:
    fn: Callable[..., Any]
    description: str
    params: dict[str, type]  # required argument names and types


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class Turn:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)

    @property
    def stop_reason(self) -> str:
        return "tool_use" if self.tool_calls else "end_turn"


class Model(Protocol):
    def respond(self, messages: list[dict], tools: dict[str, Tool]) -> Turn: ...


class RoundLimitReached(Exception):
    pass


def execute(call: ToolCall, tools: dict[str, Tool]) -> tuple[str, bool]:
    """Run one call. Returns (content, is_error); never raises."""
    tool = tools.get(call.name)
    if tool is None:
        return f"unknown tool '{call.name}'. Available: {', '.join(sorted(tools))}", True
    missing = [p for p in tool.params if p not in call.input]
    extra = [a for a in call.input if a not in tool.params]
    wrong = [p for p, t in tool.params.items() if p in call.input and not isinstance(call.input[p], t)]
    if missing or extra or wrong:
        return f"invalid arguments: missing={missing} unexpected={extra} wrong_type={wrong}", True
    try:
        return str(tool.fn(**call.input)), False
    except Exception as e:  # a failing tool is reported to the model, not raised
        return f"{call.name} failed: {e}", True


def run(model: Model, tools: dict[str, Tool], question: str, max_rounds: int = 5) -> tuple[str, list[dict]]:
    messages: list[dict] = [{"role": "user", "content": question}]
    trace: list[dict] = []
    for _ in range(max_rounds):
        turn = model.respond(messages, tools)
        messages.append({"role": "assistant", "text": turn.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "input": c.input} for c in turn.tool_calls]})
        if turn.stop_reason == "end_turn":
            return turn.text, trace
        results = []
        for call in turn.tool_calls:
            content, is_error = execute(call, tools)
            trace.append({"tool": call.name, "input": call.input, "is_error": is_error})
            results.append({"type": "tool_result", "tool_use_id": call.id, "content": content, "is_error": is_error})
        messages.append({"role": "user", "content": results})  # all results in ONE turn
    raise RoundLimitReached(f"no final answer after {max_rounds} rounds")


if __name__ == "__main__":
    class Demo:
        def respond(self, messages, tools):
            if len(messages) == 1:
                return Turn(tool_calls=[ToolCall("t1", "get_weather", {"city": "Lahore"})])
            return Turn(text=f"Weather report: {messages[-1]['content'][0]['content']}")

    tools = {"get_weather": Tool(lambda city: f"{city}: 31C, 5% rain", "Current weather for a city.", {"city": str})}
    print(run(Demo(), tools, "Do I need an umbrella in Lahore?")[0])
