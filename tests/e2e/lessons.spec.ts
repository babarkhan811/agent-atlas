import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

type L = { id: string; path: string; title: string; nodes: unknown[]; steps: { title: string }[] };
const dir = path.join(process.cwd(), "content/lessons");
const lessons: L[] = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

test.describe("every lesson renders like the prototype", () => {
  for (const l of lessons) {
    test(l.id, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/learn/${l.path}/${l.id}/`);
      await expect(page.locator(".stage-head h1")).toHaveText(l.title);
      await expect(page.locator("svg.diagram .node")).toHaveCount(l.nodes.length);
      await expect(page.locator(".tt tbody tr")).toHaveCount(l.steps.length);
      await expect(page.locator(".msg h3")).toHaveText(l.steps[0]!.title);
      await expect(page).toHaveTitle(`${l.title} · Agent Atlas`);
      expect(errors).toEqual([]);
    });
  }
});

test("step and view live in the URL and survive a reload", async ({ page }) => {
  await page.goto("/learn/knowledge-protocols/mcp/?step=4&view=sequence");
  await expect(page.locator(".msg h3")).toHaveText(lessons.find((l) => l.id === "mcp")!.steps[3]!.title);
  await expect(page.locator(".stage-body.sequence")).toBeVisible();
  await page.getByRole("button", { name: "STEP ›" }).click();
  await expect(page).toHaveURL(/step=5/);
  await page.reload();
  await expect(page.locator(".msg-no")).toContainText("MSG 05");
});

test("prototype hash links redirect to the new URLs", async ({ page }) => {
  await page.goto("/#/rag/3");
  await expect(page).toHaveURL(/\/learn\/knowledge-protocols\/rag\/\?step=3$/);
  await page.goto("/#/glossary");
  await expect(page).toHaveURL(/\/glossary\/$/);
});

test("unknown lessons get a real 404", async ({ page }) => {
  const res = await page.goto("/learn/foundations/does-not-exist/");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
});

test("guide and glossary render", async ({ page }) => {
  await page.goto("/guide/");
  await expect(page.locator("h1")).toContainText("automate cybersecurity");
  await expect(page.locator(".guide section")).toHaveCount(9);
  await page.goto("/glossary/");
  await expect(page.locator(".gloss > div")).toHaveCount(30);
});
