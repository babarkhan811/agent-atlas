// An approval gate for AI agent actions (TypeScript version of lab.py).
//
// Every side-effecting action goes through `Gate.request`. Low-risk actions run
// immediately; high-impact ones wait for a human approval that is bound to the
// exact tool and arguments, single-use and time-limited. Execution uses an
// idempotency key and every event is written to an append-only audit log.
// Run with: node lab.ts

import { createHash, randomBytes } from "node:crypto";

export type Action = { tool: string; args: Record<string, unknown> };
export type Tool = (args: Record<string, unknown> & { idempotencyKey: string }) => unknown;
export type LogEntry = { event: string; at: number; [field: string]: unknown };

/** Stable fingerprint of tool + arguments (keys sorted). */
export function digest(action: Action): string {
  const args = Object.fromEntries(Object.entries(action.args).sort(([a], [b]) => a.localeCompare(b)));
  return createHash("sha256").update(JSON.stringify({ tool: action.tool, args })).digest("hex");
}

/** Policy lives in code: big refunds and anything irreversible need a person. */
export function needsApproval(action: Action, refundLimit = 100): boolean {
  if (action.tool === "issue_refund") return Number(action.args.amount ?? 0) > refundLimit;
  return ["delete_account", "change_payout_details"].includes(action.tool);
}

export class ApprovalError extends Error {}

type Approval = { digest: string; by: string; expires: number; used: boolean };

export class Gate {
  private tools: Record<string, Tool>;
  private clock: () => number;
  private ttl: number;
  private pending = new Map<string, { action: Action; by: string }>();
  private approvals = new Map<string, Approval>();
  private entries: LogEntry[] = [];

  constructor(tools: Record<string, Tool>, clock: () => number = () => Date.now() / 1000, ttlSeconds = 24 * 3600) {
    this.tools = tools;
    this.clock = clock;
    this.ttl = ttlSeconds;
  }

  /** Read-only copy: callers (including the agent) cannot edit history. */
  get log(): LogEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  private record(event: string, fields: Record<string, unknown> = {}) {
    this.entries.push({ event, at: this.clock(), ...fields });
  }

  request(action: Action, requestedBy: string): { status: "executed"; result: unknown } | { status: "pending"; requestId: string } {
    this.record("requested", { tool: action.tool, args: action.args, by: requestedBy });
    if (!needsApproval(action)) return { status: "executed", result: this.run(action) };
    const requestId = "req_" + randomBytes(4).toString("hex");
    this.pending.set(requestId, { action, by: requestedBy });
    this.record("approval_needed", { requestId });
    return { status: "pending", requestId };
  }

  approve(requestId: string, approver: string): string {
    const req = this.pending.get(requestId);
    if (!req) throw new ApprovalError("unknown or already decided request");
    if (approver === req.by) throw new ApprovalError("requester cannot approve their own action");
    this.pending.delete(requestId);
    const approvalId = "apr_" + randomBytes(4).toString("hex");
    this.approvals.set(approvalId, { digest: digest(req.action), by: approver, expires: this.clock() + this.ttl, used: false });
    this.record("approved", { requestId, approvalId, by: approver });
    return approvalId;
  }

  execute(action: Action, approvalId: string): unknown {
    const approval = this.approvals.get(approvalId);
    if (!approval) throw new ApprovalError("unknown approval");
    if (approval.used) throw new ApprovalError("approval already used");
    if (this.clock() > approval.expires) throw new ApprovalError("approval expired");
    if (approval.digest !== digest(action)) throw new ApprovalError("action does not match what was approved");
    approval.used = true; // consume before running, so a second attempt fails
    return this.run(action, { approvalId });
  }

  private run(action: Action, fields: Record<string, unknown> = {}): unknown {
    const tool = this.tools[action.tool];
    if (!tool) throw new ApprovalError(`unknown tool ${action.tool}`);
    const idempotencyKey = `${action.tool}-${digest(action).slice(0, 12)}`; // same action -> same key
    const result = tool({ ...action.args, idempotencyKey });
    this.record("executed", { tool: action.tool, args: action.args, result, ...fields });
    return result;
  }
}

/** Pretend payments API that honours idempotency keys. */
export class FakePayments {
  calls = 0;
  private seen = new Map<string, string>();

  issueRefund = (args: Record<string, unknown> & { idempotencyKey: string }): string => {
    const prior = this.seen.get(args.idempotencyKey);
    if (prior) return prior;
    this.calls++;
    const result = `refund of ${args.amount} ${args.currency} for ${args.order_id} issued`;
    this.seen.set(args.idempotencyKey, result);
    return result;
  };
}

if (import.meta.main) {
  const payments = new FakePayments();
  const gate = new Gate({ issue_refund: payments.issueRefund });
  const refund: Action = { tool: "issue_refund", args: { order_id: "A-5521", amount: 450, currency: "USD" } };
  const pending = gate.request(refund, "support-agent");
  console.log(pending.status); // pending
  if (pending.status === "pending") {
    const approval = gate.approve(pending.requestId, "manager@shop.example");
    console.log(gate.execute(refund, approval));
  }
  console.log(gate.log.length, "audit entries");
}
