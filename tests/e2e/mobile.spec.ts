import { expect, test } from "@playwright/test";

const noHorizontalScroll = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("phone layout: portrait diagram, no horizontal page scroll", async ({ page }) => {
  await page.goto("/learn/security/soc-triage/");
  await expect(page.locator("svg.diagram")).toHaveAttribute("viewBox", "0 0 600 1000");
  expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
});

test("bug 5: phone sequence view is a vertical timeline that fits the screen", async ({ page }) => {
  await page.goto("/learn/security/software-plus-ai-agents/?view=sequence&step=3");
  const list = page.getByRole("list", { name: /Sequence of messages/ });
  await expect(list).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(8);
  await expect(page.locator("svg.seq")).toHaveCount(0);
  const box = await list.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
  await list.getByRole("button", { name: /Step 5:/ }).click();
  await expect(page.locator(".msg-no")).toContainText("MSG 05");
});
