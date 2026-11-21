// Launch pages: landing, legal, contact, social previews.
import { expect, test } from "@playwright/test";

test("landing page: hero, live preview and calls to action", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("See how AI agents really work, one message at a time.");
  const start = page.getByRole("link", { name: "Start the free lesson →" }).first();
  await expect(start).toHaveAttribute("href", /\/learn\/foundations\/llm-call\/$/);
  await expect(page.locator(".sample svg.diagram")).toBeVisible();
  await expect(page.locator(".hero-slab")).toHaveCount(8);
  await expect(page.locator(".path-card")).toHaveCount(4);
  await expect(page.getByText("Coming soon")).toHaveCount(2); // nothing can be bought yet
  await start.click();
  await expect(page).toHaveURL(/\/learn\/foundations\/llm-call\//);
});

test("legal and contact pages exist and are linked from the footer", async ({ page }) => {
  await page.goto("/");
  for (const [name, h1] of [["Privacy", "Privacy Policy"], ["Terms", "Terms of Use"], ["Contact", "Contact"]] as const) {
    await page.locator(".site-foot").getByRole("link", { name, exact: true }).click();
    await expect(page.locator("h1")).toHaveText(h1);
    await page.goBack();
  }
});

test("social previews: Open Graph and Twitter tags with an image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Agent Atlas/);
  const img = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(img).toMatch(/\/og\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const res = await request.get("/og.png");
  expect(res.status()).toBe(200);
});

test("during the free launch, Pro lessons are labelled free", async ({ page }) => {
  await page.goto("/learn/security/soc-triage/");
  await expect(page.locator(".art-facts")).toContainText("Free during launch");
});
