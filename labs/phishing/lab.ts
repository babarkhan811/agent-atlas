// Read email authentication results and score phishing signals (TypeScript version of lab.py).
//
// - Parses an Authentication-Results header (RFC 8601).
// - Recomputes DMARC from SPF/DKIM results with identifier alignment (RFC 9989).
//   Simplification: the organizational domain is the last two labels; real
//   implementations use the DNS tree walk or Public Suffix List.
// - Flags lookalike domains and returns "unsure" when signals are weak.
// Run with: node lab.ts

export type AuthResults = Record<string, Record<string, string>>;

const HOMOGLYPHS: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "7": "t" };

export function parseAuthResults(header: string): AuthResults {
  let text = header.split(/\s+/).join(" ").trim();
  if (text.toLowerCase().startsWith("authentication-results:")) text = text.slice(text.indexOf(":") + 1);
  const parts = text.split(";").map((p) => p.trim()).slice(1); // first part is the authserv-id
  const results: AuthResults = {};
  for (const part of parts) {
    const m = /^([a-z-]+)=([a-z]+)\s*(.*)$/i.exec(part);
    if (!m) continue;
    const props: Record<string, string> = { result: m[2]!.toLowerCase() };
    for (const [, key, value] of m[3]!.matchAll(/([a-z]+\.[a-z-]+)=(\S+)/gi)) props[key!.toLowerCase()] = value!;
    results[m[1]!.toLowerCase()] = props;
  }
  return results;
}

export const orgDomain = (domain: string) => domain.toLowerCase().replace(/^\.+|\.+$/g, "").split(".").slice(-2).join(".");

export function aligned(authenticated: string, fromDomain: string, mode: "r" | "s" = "r"): boolean {
  const a = authenticated.toLowerCase(), f = fromDomain.toLowerCase();
  return mode === "s" ? a === f : orgDomain(a) === orgDomain(f);
}

export const domainOf = (address: string) => address.split("@").at(-1)!.replace(/[<>]/g, "").toLowerCase();

/** DMARC passes if SPF or DKIM passes for a domain aligned with the From domain. */
export function dmarc(results: AuthResults, fromDomain: string, aspf: "r" | "s" = "r", adkim: "r" | "s" = "r"): "pass" | "fail" {
  const spf = results.spf ?? {}, dkim = results.dkim ?? {};
  const spfOk = spf.result === "pass" && aligned(domainOf(spf["smtp.mailfrom"] ?? ""), fromDomain, aspf);
  const dkimOk = dkim.result === "pass" && aligned(dkim["header.d"] ?? "", fromDomain, adkim);
  return spfOk || dkimOk ? "pass" : "fail";
}

export function isLookalike(domain: string, brands: string[]): boolean {
  const d = domain.toLowerCase();
  const normalized = [...d].map((c) => HOMOGLYPHS[c] ?? c).join("");
  for (const brand of brands) {
    const own = `${brand}.com`;
    if (orgDomain(d) === own) return false;
    if (normalized.includes(brand) && !d.includes(brand)) return true; // micr0soft -> microsoft
    if (d.includes(brand) && orgDomain(d) !== own) return true; // microsoft-login.example
  }
  return false;
}

const URGENCY = /\b(urgent|immediately|suspend(ed)?|within 24 hours|final notice|verify now)\b/i;

export function score(fromAddress: string, subject: string, authHeader: string, links: string[], brands: string[]) {
  const fromDomain = domainOf(fromAddress);
  const signals: string[] = [];
  if (dmarc(parseAuthResults(authHeader), fromDomain) === "fail") signals.push("dmarc_fail");
  if (isLookalike(fromDomain, brands)) signals.push("lookalike_sender");
  if (links.some((u) => isLookalike(u.replace(/^https?:\/\//, "").split("/")[0]!, brands))) signals.push("lookalike_link");
  if (URGENCY.test(subject)) signals.push("urgency");
  const strong = signals.some((s) => s === "lookalike_sender" || s === "lookalike_link");
  const verdict = strong && signals.length >= 2 ? "phishing" : signals.length ? "unsure" : "no_signals";
  return { verdict, signals };
}

if (import.meta.main) {
  const header = "Authentication-Results: mx.corp.example; spf=fail smtp.mailfrom=bounce@mailer-x.example; dkim=none; dmarc=fail header.from=micr0soft-help.example";
  console.log(score('"IT Support" <it-support@micr0soft-help.example>', "Urgent: your mailbox will be suspended", header,
    ["https://login.micr0soft-help.example/verify"], ["microsoft"]));
}
