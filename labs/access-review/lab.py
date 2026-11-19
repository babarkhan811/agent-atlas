"""Find leavers, movers, orphaned accounts and unused admin rights.

Compares an identity-provider export with an HR roster and produces review
items a manager can read, each with a reason and a suggested action, most
risky first. Standard library only; runs on the sample data below.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

ORDER = {"leaver_active": 0, "unused_privileged": 1, "mover_old_access": 2, "orphaned": 3}


@dataclass
class Grant:
    app: str
    role: str
    privileged: bool = False
    last_used: date | None = None
    granted_for_team: str | None = None   # team the person was in when this was granted


@dataclass
class Account:
    id: str
    employee_id: str | None
    enabled: bool = True
    grants: list[Grant] = field(default_factory=list)


@dataclass
class Employee:
    employee_id: str
    team: str
    status: str   # "active" or "left"


@dataclass
class Item:
    account: str
    kind: str
    reason: str
    suggested: str


def review(accounts: list[Account], employees: list[Employee], today: date, unused_days: int = 90) -> list[Item]:
    hr = {e.employee_id: e for e in employees}   # match on stable IDs, never names
    items: list[Item] = []
    for a in accounts:
        person = hr.get(a.employee_id) if a.employee_id else None
        if person is None:
            items.append(Item(a.id, "orphaned", "no matching person in HR", "assign a named owner or disable"))
            continue
        if person.status == "left" and a.enabled:
            items.append(Item(a.id, "leaver_active", "person has left but the account is enabled", "disable now"))
            continue
        for g in a.grants:
            if g.granted_for_team and g.granted_for_team != person.team:
                items.append(Item(a.id, "mover_old_access",
                                  f"{g.role} on {g.app} was granted for {g.granted_for_team}; now in {person.team}",
                                  "remove unless the manager confirms it is still needed"))
            elif g.privileged:
                idle = None if g.last_used is None else (today - g.last_used).days
                if idle is None or idle > unused_days:
                    when = "never used" if idle is None else f"unused for {idle} days"
                    items.append(Item(a.id, "unused_privileged", f"{g.role} on {g.app}, {when}", "remove"))
    return sorted(items, key=lambda i: (ORDER[i.kind], i.account))


TODAY = date(2026, 11, 19)
EMPLOYEES = [Employee("e1", "Finance", "active"), Employee("e2", "HR", "active"), Employee("e3", "Sales", "left")]
ACCOUNTS = [
    Account("j.lee", "e1", grants=[Grant("billing", "admin", privileged=True, last_used=date(2026, 7, 2))]),
    Account("m.ali", "e2", grants=[Grant("crm", "admin", privileged=True, last_used=date(2026, 11, 1), granted_for_team="Sales")]),
    Account("s.khan", "e3", grants=[Grant("crm", "user")]),
    Account("svc-report", None, grants=[Grant("warehouse", "reader")]),
]

if __name__ == "__main__":
    for i in review(ACCOUNTS, EMPLOYEES, TODAY):
        print(f"{i.kind:18} {i.account:11} {i.reason} -> {i.suggested}")
