"""A tiny tracer for agent runs, using OpenTelemetry GenAI-style names.

Produces nested spans (invoke_agent -> chat / execute_tool), records usage and
errors on the span where they happen, and leaves message content out unless
capture is explicitly enabled. Standard library only; in production use the
OpenTelemetry SDK and export over OTLP instead.

Attribute names follow the OpenTelemetry GenAI semantic conventions, which are
in Development status (checked 2026-11-19) and may change.
"""
from __future__ import annotations

import itertools
import secrets
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Iterator


@dataclass
class Span:
    name: str
    trace_id: str
    span_id: str
    parent_id: str | None
    start: float
    end: float | None = None
    status: str = "OK"
    attributes: dict[str, Any] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)


class Tracer:
    def __init__(self, capture_content: bool = False, clock: Callable[[], float] | None = None):
        self.capture_content = capture_content
        self.spans: list[Span] = []
        ticks = itertools.count()
        self.clock = clock or (lambda: float(next(ticks)))  # deterministic default for tests
        self._stack: list[Span] = []
        self._trace_id = secrets.token_hex(16)

    @contextmanager
    def span(self, name: str, **attributes: Any) -> Iterator[Span]:
        parent = self._stack[-1] if self._stack else None
        s = Span(name, self._trace_id, secrets.token_hex(8), parent.span_id if parent else None, self.clock(), attributes=dict(attributes))
        self.spans.append(s)
        self._stack.append(s)
        try:
            yield s
        except Exception as e:
            s.status = "ERROR"
            s.attributes["error.type"] = type(e).__name__
            s.events.append({"name": "exception", "message": str(e)})
            raise
        finally:
            s.end = self.clock()
            self._stack.pop()

    def content(self, span: Span, key: str, value: str) -> None:
        """Record message content only when capture is enabled; otherwise just its size."""
        if self.capture_content:
            span.attributes[key] = value
        else:
            span.attributes[key + ".length"] = len(value)


def run_agent(tracer: Tracer, model: Callable[[list[dict]], dict], tools: dict[str, Callable[..., str]],
              question: str, model_id: str = "example-model", max_retries: int = 1) -> str:
    """A minimal agent loop instrumented with spans."""
    with tracer.span("invoke_agent support-agent", **{"gen_ai.operation.name": "invoke_agent"}) as root:
        tracer.content(root, "gen_ai.input.messages", question)
        messages = [{"role": "user", "content": question}]
        while True:
            with tracer.span(f"chat {model_id}", **{"gen_ai.operation.name": "chat", "gen_ai.provider.name": "anthropic",
                                                    "gen_ai.request.model": model_id}) as s:
                reply = model(messages)
                u = reply["usage"]
                # Convention: input_tokens includes cached tokens; Anthropic reports them separately, so sum.
                s.attributes["gen_ai.usage.input_tokens"] = u["input_tokens"] + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
                s.attributes["gen_ai.usage.cache_read.input_tokens"] = u.get("cache_read_input_tokens", 0)
                s.attributes["gen_ai.usage.output_tokens"] = u["output_tokens"]
                s.attributes["gen_ai.response.finish_reasons"] = [reply["stop_reason"]]
            if reply["stop_reason"] != "tool_use":
                tracer.content(root, "gen_ai.output.messages", reply["text"])
                root.attributes["outcome"] = "answered"
                return reply["text"]
            call = reply["tool_call"]
            result = None
            for attempt in range(1, max_retries + 2):
                try:
                    with tracer.span(f"execute_tool {call['name']}", **{"gen_ai.operation.name": "execute_tool",
                                     "gen_ai.tool.name": call["name"], "gen_ai.tool.call.id": call["id"], "attempt": attempt}):
                        result = tools[call["name"]](**call["input"])
                    break
                except Exception as e:
                    result = f"ERROR: {e}"  # reported to the model, not raised
            messages += [{"role": "assistant", "tool_call": call}, {"role": "tool", "id": call["id"], "content": result}]


def summarize(tracer: Tracer) -> dict[str, Any]:
    chats = [s for s in tracer.spans if s.attributes.get("gen_ai.operation.name") == "chat"]
    tools = [s for s in tracer.spans if s.attributes.get("gen_ai.operation.name") == "execute_tool"]
    root = next(s for s in tracer.spans if s.parent_id is None)
    return {
        "model_calls": len(chats),
        "tool_calls": len(tools),
        "errors": sum(1 for s in tracer.spans if s.status == "ERROR"),
        "input_tokens": sum(s.attributes["gen_ai.usage.input_tokens"] for s in chats),
        "output_tokens": sum(s.attributes["gen_ai.usage.output_tokens"] for s in chats),
        "duration": root.end - root.start,
    }


if __name__ == "__main__":
    turns = [
        {"stop_reason": "tool_use", "text": "", "tool_call": {"id": "toolu_1", "name": "lookup_order", "input": {"order_id": "A-5521"}},
         "usage": {"input_tokens": 340, "cache_read_input_tokens": 2900, "output_tokens": 60}},
        {"stop_reason": "end_turn", "text": "Your refund was issued on 3 Nov.", "usage": {"input_tokens": 120, "output_tokens": 40}},
    ]
    tracer = Tracer()
    run_agent(tracer, lambda messages: turns.pop(0), {"lookup_order": lambda order_id: f"{order_id}: refunded"}, "Where is my refund?")
    for s in tracer.spans:
        print(("  " if s.parent_id else "") + f"{s.name} [{s.status}]")
    print(summarize(tracer))
