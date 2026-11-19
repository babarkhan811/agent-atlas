// Build an incident timeline from several log sources (TypeScript version of lab.py).
//
// Merges events into one time-ordered list, flags known persistence techniques
// (outside mail forwarding, attacker MFA device) and lists open questions for the
// incident team. No dependencies; run with: node lab.ts

export type Event = { time: string; source: string; action: string; detail?: Record<string, unknown> };
export type Entry = { when: Date; source: string; action: string; detail: Record<string, unknown>; flags: string[] };

export function flagsFor(e: Event, internalDomain: string): string[] {
  const d = e.detail ?? {};
  const flags: string[] = [];
  if (e.action === "inbox-rule-created") {
    const target = String(d.forward_to ?? "");
    if (target && !target.toLowerCase().endsWith("@" + internalDomain.toLowerCase())) {
      flags.push("persistence: outside forwarding rule (ATT&CK T1114.003)");
    }
  }
  if (e.action === "mfa-method-added" && d.by_user_confirmed !== true) {
    flags.push("persistence: unconfirmed MFA device (ATT&CK T1098.005)");
  }
  if (e.action === "sign-in" && d.new_country) flags.push("suspicious: sign-in from a new country");
  return flags;
}

export function buildTimeline(events: Event[], internalDomain: string): Entry[] {
  return events
    .map((e) => ({ when: new Date(e.time), source: e.source, action: e.action, detail: e.detail ?? {}, flags: flagsFor(e, internalDomain) }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());
}

export function openQuestions(timeline: Entry[]): string[] {
  const questions: string[] = [];
  for (const x of timeline) {
    if (x.action === "inbox-rule-created" && x.flags.length) {
      questions.push(`Do any other mailboxes forward to ${String(x.detail.forward_to ?? "").split("@").at(-1)}?`);
    }
    if (x.action === "sign-in" && x.flags.length) {
      questions.push(`Did any other account sign in from ${String(x.detail.ip ?? "the same IP")}?`);
    }
  }
  if (!timeline.some((x) => x.source === "files")) questions.push("No file events found: was file auditing enabled for this period?");
  return [...new Set(questions)];
}

export const SAMPLE: Event[] = [
  { time: "2026-11-19T02:19:00+00:00", source: "identity", action: "mfa-method-added", detail: { method: "phone" } },
  { time: "2026-11-19T02:14:00+00:00", source: "identity", action: "sign-in", detail: { ip: "203.0.113.50", new_country: true } },
  { time: "2026-11-19T02:23:00+00:00", source: "mail", action: "inbox-rule-created", detail: { forward_to: "invoices@example.net" } },
];

if (import.meta.main) {
  const timeline = buildTimeline(SAMPLE, "corp.example");
  for (const x of timeline) console.log(x.when.toISOString().slice(11, 16), x.source, x.action, "|", x.flags.join("; ") || "-");
  console.log("Open questions:\n- " + openQuestions(timeline).join("\n- "));
}
