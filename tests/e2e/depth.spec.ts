// B1: depth system behaviour (tilt, sliding toggles, reduced motion).
import { expect, test } from "@playwright/test";

test("cards tilt toward the pointer on desktop", async ({ page }) => {
  await page.goto("/learn/");
  const card = page.locator(".path-card").first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await expect(card).toHaveClass(/tilting/);
  const ry = await card.evaluate((el) => parseFloat(el.style.getPropertyValue("--ry")));
  expect(ry).toBeGreaterThan(0); // pointer on the right tilts the card right
  await page.mouse.move(5, 5);
  await expect(card).not.toHaveClass(/tilting/);
});

test("segmented toggles slide their thumb to the selected option", async ({ page }) => {
  await page.goto("/learn/foundations/tool-use/");
  const view = page.getByRole("tablist", { name: "View" });
  await expect(view).toHaveAttribute("style", /--i:\s*0/);
  await page.getByRole("tab", { name: "≡ SEQUENCE" }).click();
  await expect(view).toHaveAttribute("style", /--i:\s*1/);
  const depth = page.getByRole("radiogroup", { name: "Explanation depth" });
  await depth.getByRole("radio", { name: "Expert" }).click();
  await expect(depth).toHaveAttribute("style", /--i:\s*2/);
});

test("reduced motion keeps depth but removes movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/");
  const card = page.locator(".path-card").first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + 10);
  await expect(card).not.toHaveClass(/tilting/); // tilt listener never attaches
  const drift = await page.evaluate(() => getComputedStyle(document.body, "::after").animationName);
  expect(drift).toBe("none");
  const shadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none"); // depth stays
});

test("diagram animations pause when scrolled out of view", async ({ page }) => {
  await page.goto("/learn/foundations/tool-use/");
  const svg = page.locator("svg.diagram");
  await expect(svg).not.toHaveClass(/paused/);
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect(svg).toHaveClass(/paused/);
});
