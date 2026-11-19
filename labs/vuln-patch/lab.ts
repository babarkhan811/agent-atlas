// A vulnerability prioritiser (TypeScript version of lab.py).
//
// Combines CVSS severity, CISA KEV status, EPSS probability, reachability and
// exposure into a priority (P1 fix now ... P4 track) with plain-English reasons.
// The thresholds are a starting point to tune, not a standard. Run with: node lab.ts

export type Exposure = "internet" | "internal" | "offline";
export type Finding = {
  cve: string;
  pkg: string;
  cvss: number;               // CVSS v4.0 score, 0-10
  kev: boolean;               // listed in CISA's Known Exploited Vulnerabilities catalog
  epss: number;               // probability of exploitation in the next 30 days, 0-1
  reachable: boolean | null;  // null = not analysed
  exposure: Exposure;
};

export function check(f: Finding): Finding {
  if (!(f.cvss >= 0 && f.cvss <= 10)) throw new RangeError("cvss must be between 0 and 10");
  if (!(f.epss >= 0 && f.epss <= 1)) throw new RangeError("epss must be between 0 and 1");
  if (!["internet", "internal", "offline"].includes(f.exposure)) throw new RangeError("exposure must be internet, internal or offline");
  return f;
}

/** CVSS qualitative rating scale (FIRST). */
export function severityBand(cvss: number): string {
  if (cvss === 0) return "None";
  if (cvss < 4) return "Low";
  if (cvss < 7) return "Medium";
  if (cvss < 9) return "High";
  return "Critical";
}

export function prioritise(f: Finding): { priority: string; reasons: string[] } {
  check(f);
  const reasons = [`CVSS ${f.cvss} (${severityBand(f.cvss)})`];
  if (f.kev) reasons.push("listed in CISA KEV: exploited in the wild");
  if (f.epss >= 0.1) reasons.push(`EPSS ${f.epss.toFixed(2)}: elevated chance of exploitation in 30 days`);
  if (f.reachable === true) reasons.push("vulnerable code is reachable");
  else if (f.reachable === false) reasons.push("vulnerable code not reachable (re-check when code changes)");
  else reasons.push("reachability not analysed");
  reasons.push(`exposure: ${f.exposure}`);

  const possiblyReachable = f.reachable !== false;
  let priority = "P4";
  if (f.exposure !== "offline" && possiblyReachable && (f.kev || (f.exposure === "internet" && f.cvss >= 7))) priority = "P1";
  else if (f.kev || (possiblyReachable && (f.cvss >= 7 || f.epss >= 0.1))) priority = "P2";
  else if (possiblyReachable || f.cvss >= 4) priority = "P3";
  return { priority, reasons };
}

export function rank(findings: Finding[]) {
  return findings
    .map((f) => ({ ...prioritise(f), finding: f }))
    .sort((a, b) => a.priority.localeCompare(b.priority) || b.finding.cvss - a.finding.cvss || b.finding.epss - a.finding.epss);
}

export const SAMPLE: Finding[] = [
  { cve: "CVE-2026-0001 (example)", pkg: "image-lib", cvss: 8.8, kev: false, epss: 0.12, reachable: true, exposure: "internet" },
  { cve: "CVE-2026-0002 (example)", pkg: "xml-kit", cvss: 9.8, kev: false, epss: 0.02, reachable: false, exposure: "internal" },
  { cve: "CVE-2026-0003 (example)", pkg: "auth-helper", cvss: 7.5, kev: true, epss: 0.4, reachable: null, exposure: "internal" },
  { cve: "CVE-2026-0004 (example)", pkg: "csv-tools", cvss: 5.3, kev: false, epss: 0.01, reachable: false, exposure: "offline" },
];

if (import.meta.main) {
  for (const r of rank(SAMPLE)) console.log(r.priority, r.finding.cve, r.finding.pkg, "-", r.reasons.join("; "));
}
