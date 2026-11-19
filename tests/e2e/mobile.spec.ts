import { expect, test } from "@playwright/test";

test("phone layout: portrait diagram, no horizontal page scroll", async ({ page }) => {
  await page.goto("/learn/security/soc-triage/");
  const vb = await page.locator("svg.diagram").getAttribute("viewBox");
  expect(vb).toBe("0 0 600 1000");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
