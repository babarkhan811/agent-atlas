import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  ["lesson (network)", "/learn/security/soc-triage/?step=2"],
  ["lesson (sequence)", "/learn/knowledge-protocols/mcp/?step=4&view=sequence"],
  ["guide", "/guide/"],
  ["glossary", "/glossary/"],
  ["404", "/learn/foundations/missing/"],
] as const;

for (const theme of ["dark", "light"] as const) {
  for (const [name, url] of PAGES) {
    test(`axe: ${name}, ${theme} theme has no serious or critical issues`, async ({ page }) => {
      await page.goto(url + (url.includes("?") ? "&" : "?") + `theme=${theme}`);
      await page.waitForTimeout(1600); // let the packet animation settle
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}
