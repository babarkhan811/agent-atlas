// Cost per call, cost per task, and budget enforcement for an agent loop.
//
// All prices here are ILLUSTRATIVE (US dollars per million tokens). Load real
// rates from your provider's pricing page into PRICES before using this.
// Cache multipliers follow Anthropic's published structure: 5-minute cache
// writes cost 1.25x input, 1-hour writes 2x, reads 0.1x on most models.
// Run with: node lab.ts

const MILLION = 1_000_000;

export type Rates = { input: number; output: number; cacheReadMultiplier?: number };
export type Usage = {
  input_tokens?: number; // uncached remainder only
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_ttl?: "5m" | "1h";
};

export const PRICES: Record<string, Rates> = { // illustrative
  large: { input: 3.0, output: 15.0 },
  small: { input: 0.25, output: 1.25 },
};

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function callCost(model: string, u: Usage, prices: Record<string, Rates> = PRICES): number {
  const r = prices[model];
  if (!r) throw new Error(`no price for model ${model}`);
  const writeRate = r.input * (u.cache_ttl === "1h" ? 2.0 : 1.25);
  const readRate = r.input * (r.cacheReadMultiplier ?? 0.1);
  const dollars = ((u.input_tokens ?? 0) * r.input
    + (u.cache_creation_input_tokens ?? 0) * writeRate
    + (u.cache_read_input_tokens ?? 0) * readRate
    + (u.output_tokens ?? 0) * r.output) / MILLION;
  return round6(dollars);
}

export type Budget = { perTask: number; perUserDay: number };

export class Meter {
  budget: Budget;
  taskSpend = new Map<string, number>();
  userSpend = new Map<string, number>();
  constructor(budget: Budget) {
    this.budget = budget;
  }

  /** null if the projected call fits both budgets, else why not. */
  refusalReason(taskId: string, user: string, projected: number): string | null {
    if ((this.taskSpend.get(taskId) ?? 0) + projected > this.budget.perTask) return "task budget";
    if ((this.userSpend.get(user) ?? 0) + projected > this.budget.perUserDay) return "daily user budget";
    return null;
  }

  record(taskId: string, user: string, cost: number): void {
    this.taskSpend.set(taskId, round6((this.taskSpend.get(taskId) ?? 0) + cost));
    this.userSpend.set(user, round6((this.userSpend.get(user) ?? 0) + cost));
  }
}

export type Step = { model: string; projected: Usage; actual: Usage };
export type TaskResult = { status: "completed" | "budget_stop"; cost: number; calls: number; stoppedBy?: string };

/** Run planned calls in order; stop gracefully before any call that would break a budget. */
export function runTask(taskId: string, user: string, steps: Iterable<Step>, meter: Meter): TaskResult {
  let calls = 0;
  for (const step of steps) {
    const reason = meter.refusalReason(taskId, user, callCost(step.model, step.projected));
    if (reason) return { status: "budget_stop", cost: meter.taskSpend.get(taskId) ?? 0, calls, stoppedBy: reason };
    meter.record(taskId, user, callCost(step.model, step.actual));
    calls++;
  }
  return { status: "completed", cost: meter.taskSpend.get(taskId) ?? 0, calls };
}

/** Total spend (including failed or stopped tasks) divided by tasks that completed. */
export function costPerCompletedTask(results: TaskResult[]): number {
  const completed = results.filter((r) => r.status === "completed").length;
  if (completed === 0) throw new Error("no completed tasks");
  return round6(results.reduce((sum, r) => sum + r.cost, 0) / completed);
}

if (import.meta.main) {
  const main: Usage = { input_tokens: 2_000, cache_read_input_tokens: 10_000, output_tokens: 800 };
  console.log("main call:", callCost("large", main)); // 0.021
  console.log("same prefix uncached:", callCost("large", { input_tokens: 12_000, output_tokens: 800 }));
}
