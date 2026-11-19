"""Cost per call, cost per task, and budget enforcement for an agent loop.

All prices here are ILLUSTRATIVE (US dollars per million tokens). Load real
rates from your provider's pricing page into PRICES before using this.
Cache multipliers follow Anthropic's published structure: 5-minute cache
writes cost 1.25x input, 1-hour writes 2x, reads 0.1x on most models.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

MILLION = 1_000_000


@dataclass(frozen=True)
class Rates:
    input: float          # $ per million uncached input tokens
    output: float         # $ per million output tokens (reasoning included)
    cache_read_multiplier: float = 0.1

    @property
    def cache_read(self) -> float:
        return self.input * self.cache_read_multiplier

    def cache_write(self, ttl: str) -> float:
        return self.input * (2.0 if ttl == "1h" else 1.25)


PRICES = {  # illustrative
    "large": Rates(input=3.00, output=15.00),
    "small": Rates(input=0.25, output=1.25),
}


@dataclass(frozen=True)
class Usage:
    input_tokens: int = 0                  # uncached remainder only
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_ttl: str = "5m"


def call_cost(model: str, usage: Usage, prices: dict[str, Rates] = PRICES) -> float:
    r = prices[model]
    dollars = (usage.input_tokens * r.input
               + usage.cache_creation_input_tokens * r.cache_write(usage.cache_ttl)
               + usage.cache_read_input_tokens * r.cache_read
               + usage.output_tokens * r.output) / MILLION
    return round(dollars, 6)


@dataclass
class Budget:
    per_task: float
    per_user_day: float


@dataclass
class Meter:
    budget: Budget
    task_spend: dict[str, float] = field(default_factory=dict)
    user_spend: dict[str, float] = field(default_factory=dict)

    def refusal_reason(self, task_id: str, user: str, projected: float) -> str | None:
        """None if the projected call fits both budgets, else why not."""
        if self.task_spend.get(task_id, 0.0) + projected > self.budget.per_task:
            return "task budget"
        if self.user_spend.get(user, 0.0) + projected > self.budget.per_user_day:
            return "daily user budget"
        return None

    def record(self, task_id: str, user: str, cost: float) -> None:
        self.task_spend[task_id] = round(self.task_spend.get(task_id, 0.0) + cost, 6)
        self.user_spend[user] = round(self.user_spend.get(user, 0.0) + cost, 6)


@dataclass
class Step:
    model: str
    projected: Usage   # estimate before the call (e.g. from a token-counting endpoint)
    actual: Usage      # what the response's usage reported


@dataclass
class TaskResult:
    status: str        # "completed" or "budget_stop"
    cost: float
    calls: int
    stopped_by: str | None = None


def run_task(task_id: str, user: str, steps: Iterable[Step], meter: Meter) -> TaskResult:
    """Run planned calls in order; stop gracefully before any call that would break a budget."""
    calls = 0
    for step in steps:
        reason = meter.refusal_reason(task_id, user, call_cost(step.model, step.projected))
        if reason:
            return TaskResult("budget_stop", meter.task_spend.get(task_id, 0.0), calls, reason)
        meter.record(task_id, user, call_cost(step.model, step.actual))
        calls += 1
    return TaskResult("completed", meter.task_spend.get(task_id, 0.0), calls)


def cost_per_completed_task(results: list[TaskResult]) -> float:
    """Total spend (including failed or stopped tasks) divided by tasks that completed."""
    completed = sum(1 for r in results if r.status == "completed")
    if completed == 0:
        raise ValueError("no completed tasks")
    return round(sum(r.cost for r in results) / completed, 6)


if __name__ == "__main__":
    main = Usage(input_tokens=2_000, cache_read_input_tokens=10_000, output_tokens=800)
    print("main call:", call_cost("large", main))                     # 0.021
    print("same prefix uncached:", call_cost("large", Usage(input_tokens=12_000, output_tokens=800)))
