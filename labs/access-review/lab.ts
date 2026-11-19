// Find leavers, movers, orphaned accounts and unused admin rights (TypeScript version of lab.py).
//
// Compares an identity-provider export with an HR roster and produces review
// items a manager can read, each with a reason and a suggested action, most
// risky first. No dependencies; run with: node lab.ts

export type Grant = { app: string; role: string; privileged?: boolean; lastUsed?: string | null; grantedForTeam?: string | null };
export type Account = { id: string; employeeId: string | null; enabled?: boolean; grants?: Grant[] };
export type Employee = { employeeId: string; team: string; status: "active" | "left" };
export type Kind = "leaver_active" | "unused_privileged" | "mover_old_access" | "orphaned";
export type Item = { account: string; kind: Kind; reason: string; suggested: string };

const ORDER: Record<Kind, number> = { leaver_active: 0, unused_privileged: 1, mover_old_access: 2, orphaned: 3 };
const DAY = 86_400_000;

export function review(accounts: Account[], employees: Employee[], today: string, unusedDays = 90): Item[] {
  const hr = new Map(employees.map((e) => [e.employeeId, e])); // match on stable IDs, never names
  const items: Item[] = [];
  for (const a of accounts) {
    const person = a.employeeId ? hr.get(a.employeeId) : undefined;
    if (!person) {
      items.push({ account: a.id, kind: "orphaned", reason: "no matching person in HR", suggested: "assign a named owner or disable" });
      continue;
    }
    if (person.status === "left" && a.enabled !== false) {
      items.push({ account: a.id, kind: "leaver_active", reason: "person has left but the account is enabled", suggested: "disable now" });
      continue;
    }
    for (const g of a.grants ?? []) {
      if (g.grantedForTeam && g.grantedForTeam !== person.team) {
        items.push({
          account: a.id, kind: "mover_old_access",
          reason: `${g.role} on ${g.app} was granted for ${g.grantedForTeam}; now in ${person.team}`,
          suggested: "remove unless the manager confirms it is still needed",
        });
      } else if (g.privileged) {
        const idle = g.lastUsed ? Math.round((Date.parse(today) - Date.parse(g.lastUsed)) / DAY) : null;
        if (idle === null || idle > unusedDays) {
          const when = idle === null ? "never used" : `unused for ${idle} days`;
          items.push({ account: a.id, kind: "unused_privileged", reason: `${g.role} on ${g.app}, ${when}`, suggested: "remove" });
        }
      }
    }
  }
  return items.sort((x, y) => ORDER[x.kind] - ORDER[y.kind] || x.account.localeCompare(y.account));
}

export const TODAY = "2026-11-19";
export const EMPLOYEES: Employee[] = [
  { employeeId: "e1", team: "Finance", status: "active" },
  { employeeId: "e2", team: "HR", status: "active" },
  { employeeId: "e3", team: "Sales", status: "left" },
];
export const ACCOUNTS: Account[] = [
  { id: "j.lee", employeeId: "e1", grants: [{ app: "billing", role: "admin", privileged: true, lastUsed: "2026-07-02" }] },
  { id: "m.ali", employeeId: "e2", grants: [{ app: "crm", role: "admin", privileged: true, lastUsed: "2026-11-01", grantedForTeam: "Sales" }] },
  { id: "s.khan", employeeId: "e3", grants: [{ app: "crm", role: "user" }] },
  { id: "svc-report", employeeId: null, grants: [{ app: "warehouse", role: "reader" }] },
];

if (import.meta.main) {
  for (const i of review(ACCOUNTS, EMPLOYEES, TODAY)) console.log(i.kind.padEnd(18), i.account.padEnd(11), i.reason, "->", i.suggested);
}
