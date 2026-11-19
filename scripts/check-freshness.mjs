// Warns (never fails) when a lesson's lastVerified date is older than 90 days or missing.
// In GitHub Actions the warnings appear as annotations on the run.
import fs from "node:fs";
import path from "node:path";

const MAX_AGE_DAYS = 90;
const dir = path.resolve("content/lessons");
const now = Date.now();
const gha = !!process.env.GITHUB_ACTIONS;
let stale = 0, unverified = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const { id, lastVerified } = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const file = `content/lessons/${f}`;
  if (!lastVerified) {
    unverified++;
    continue;
  }
  const age = Math.floor((now - Date.parse(lastVerified)) / 86_400_000);
  if (age > MAX_AGE_DAYS) {
    stale++;
    const msg = `${id} was last verified ${age} days ago (${lastVerified}); re-check its sources.`;
    console.log(gha ? `::warning file=${file}::${msg}` : `warning: ${msg}`);
  }
}
console.log(`freshness: ${stale} stale, ${unverified} not yet verified (no lastVerified), limit ${MAX_AGE_DAYS} days`);
