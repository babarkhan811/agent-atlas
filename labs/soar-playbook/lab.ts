// A small playbook runner with risk-tagged steps (TypeScript version of lab.py).
//
// - The AI decision step may only return an allowed path; anything else, or a
//   hard rule such as "servers always escalate", forces escalation.
// - Read-only and reversible steps run automatically; disruptive steps need
//   approval. Actions can be verified; a failed check escalates.
// - dryRun logs what would happen without changing anything. Run with: node lab.ts

export type Risk = "read" | "reversible" | "disruptive";
export type Alert = { host: string; asset_class?: string; [k: string]: unknown };
export type Step = { name: string; risk: Risk; run: (a: Alert) => unknown; verify?: (a: Alert) => boolean };
export const PATHS = ["auto_contain", "escalate", "close_benign"] as const;
export type Path = (typeof PATHS)[number];

export function choosePath(alert: Alert, decide: (a: Alert) => string): [Path, string] {
  if (alert.asset_class === "server" || alert.asset_class === "executive") return ["escalate", "rule: sensitive asset"];
  const choice = decide(alert);
  if (!(PATHS as readonly string[]).includes(choice)) return ["escalate", `invalid choice '${choice}'`];
  return [choice as Path, "model"];
}

export function runPlaybook(alert: Alert, decide: (a: Alert) => string, steps: Partial<Record<Path, Step[]>>,
  approve: (s: Step, a: Alert) => boolean, dryRun = false) {
  const [path, reason] = choosePath(alert, decide);
  const log = [`path=${path} (${reason})`];
  for (const step of steps[path] ?? []) {
    if (step.risk === "disruptive" && !approve(step, alert)) {
      log.push(`${step.name}: waiting for approval`);
      return { status: "awaiting_approval", log };
    }
    if (dryRun) { log.push(`${step.name}: would run (${step.risk})`); continue; }
    try { step.run(alert); } catch (e) {
      log.push(`${step.name}: failed: ${(e as Error).message}`);
      return { status: "escalated", log };
    }
    if (step.verify && !step.verify(alert)) {
      log.push(`${step.name}: verification failed`);
      return { status: "escalated", log };
    }
    log.push(`${step.name}: done (${step.risk})`);
  }
  const status = { auto_contain: "contained", close_benign: "closed", escalate: "escalated" }[path];
  return { status: dryRun ? "dry_run" : status, log };
}

if (import.meta.main) {
  const state = { quarantined: false };
  const steps = { auto_contain: [
    { name: "lookup_hash", risk: "read", run: () => "malicious" },
    { name: "quarantine_file", risk: "reversible", run: () => { state.quarantined = true; }, verify: () => state.quarantined },
  ] as Step[] };
  console.log(runPlaybook({ host: "HR-PC-07", asset_class: "workstation" }, () => "auto_contain", steps, () => false));
}
