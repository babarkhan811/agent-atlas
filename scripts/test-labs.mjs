// Runs every lab's Python (unittest) and TypeScript (node:test) tests.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("labs");
const python = ["python3", "python"].find((p) => spawnSync(p, ["--version"]).status === 0);
if (!python) {
  console.error("Python 3 is required for the lab tests.");
  process.exit(1);
}

let failed = 0;
for (const dir of fs.readdirSync(root).sort()) {
  const cwd = path.join(root, dir);
  if (!fs.statSync(cwd).isDirectory()) continue;
  for (const [label, cmd, args] of [
    ["python", python, ["-m", "unittest", "-q", "lab_test"]],
    ["typescript", process.execPath, ["--test", "lab.test.ts"]],
  ]) {
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
    const ok = r.status === 0;
    console.log(`${ok ? "ok  " : "FAIL"} labs/${dir} (${label})`);
    if (!ok) {
      failed++;
      console.log(r.stdout, r.stderr);
    }
  }
}
process.exit(failed ? 1 : 0);
