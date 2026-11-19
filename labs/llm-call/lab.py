"""Read a streamed LLM reply correctly.

Assembles the text, records token usage, and refuses to treat a reply that
was cut off (stop reason "max_tokens") or a broken stream as finished.

Events follow Anthropic's Messages streaming format. Other providers use
different event names; adapt `collect` with a small mapping layer.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Iterator

FINISHED = ("end_turn", "stop_sequence")


@dataclass
class Reply:
    text: str
    stop_reason: str | None
    input_tokens: int
    output_tokens: int

    @property
    def complete(self) -> bool:
        return self.stop_reason in FINISHED


class TruncatedReply(Exception):
    """The model stopped before finishing, e.g. it hit max_tokens."""


def collect(events: Iterable[dict]) -> Reply:
    text: list[str] = []
    stop_reason, input_tokens, output_tokens = None, 0, 0
    started = finished = False
    for event in events:
        kind = event.get("type")
        if kind == "message_start":
            started = True
            input_tokens = event["message"]["usage"]["input_tokens"]
        elif kind == "content_block_delta" and event["delta"].get("type") == "text_delta":
            text.append(event["delta"]["text"])
        elif kind == "message_delta":
            stop_reason = event["delta"].get("stop_reason")
            output_tokens = event.get("usage", {}).get("output_tokens", output_tokens)
        elif kind == "message_stop":
            finished = True
        elif kind == "error":  # errors can arrive mid-stream after an HTTP 200
            raise RuntimeError(event.get("error", {}).get("message", "stream error"))
        # "ping" and unknown event types are ignored on purpose.
    if not (started and finished):
        raise ConnectionError("stream ended before message_stop")
    return Reply("".join(text), stop_reason, input_tokens, output_tokens)


def require_complete(reply: Reply) -> str:
    if not reply.complete:
        raise TruncatedReply(f"reply stopped with {reply.stop_reason!r} after {reply.output_tokens} tokens")
    return reply.text


def fake_stream(text: str, stop_reason: str = "end_turn", input_tokens: int = 30) -> Iterator[dict]:
    """A recorded-style stream so the lab runs without an API key."""
    yield {"type": "message_start", "message": {"id": "msg_lab", "usage": {"input_tokens": input_tokens}}}
    yield {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}
    words = text.split(" ")
    for i, word in enumerate(words):
        yield {"type": "content_block_delta", "index": 0,
               "delta": {"type": "text_delta", "text": word if i == 0 else " " + word}}
        if i == 1:
            yield {"type": "ping"}
    yield {"type": "content_block_stop", "index": 0}
    yield {"type": "message_delta", "delta": {"stop_reason": stop_reason}, "usage": {"output_tokens": len(words)}}
    yield {"type": "message_stop"}


if __name__ == "__main__":
    reply = collect(fake_stream("A webhook is a URL another app calls the moment something happens."))
    print(require_complete(reply))
    print(f"tokens: {reply.input_tokens} in, {reply.output_tokens} out")
