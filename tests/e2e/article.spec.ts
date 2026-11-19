// Phase 2 / A1: rich lesson pages.
import { expect, test } from "@playwright/test";

const PILOTS = [
  ["/learn/foundations/llm-call/", 6],
  ["/learn/foundations/tool-use/", 8],
  ["/learn/security/software-plus-ai-agents/", 8],
] as const;
const TOOL_USE = "/learn/foundations/tool-use/";

for (const [url, steps] of PILOTS) {
  test(`server-rendered guide on ${url}`, async ({ request }) => {
    const html = await (await request.get(url)).text();
    // The article is in the HTML before any JavaScript runs (indexable).
    const article = html.slice(html.indexOf('<article class="article"'), html.indexOf("</article>"));
    const words = article.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThan(1200);
    for (let i = 1; i <= steps; i++) expect(article).toContain(`id="step-${i}"`);
    for (const id of ["overview", "concepts", "production", "try-it", "quiz", "takeaways", "faq", "sources"]) expect(article).toContain(`id="${id}"`);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"LearningResource"');
    expect(html).toContain('"@type":"BreadcrumbList"');
  });
}

test("depth switch changes the narration and is kept in the URL", async ({ page }) => {
  await page.goto(`${TOOL_USE}?step=3`);
  const depth = page.getByRole("radiogroup", { name: "Explanation depth" });
  await expect(depth.getByRole("radio", { name: "Practitioner" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#decoded-msg .fields")).toBeVisible();

  await depth.getByRole("radio", { name: "Beginner" }).click();
  await expect(page).toHaveURL(/depth=beginner/);
  await expect(page.locator("#decoded-msg .fields")).toHaveCount(0);
  await expect(page.locator("#decoded-msg .narr")).toContainText("never presses any buttons");

  await depth.getByRole("radio", { name: "Expert" }).click();
  await expect(page.locator("#decoded-msg .providers")).toContainText("function_call");
  await page.reload();
  await expect(depth.getByRole("radio", { name: "Expert" })).toHaveAttribute("aria-checked", "true");
});

test("'Show step' in the article drives the simulation", async ({ page }) => {
  await page.goto(TOOL_USE);
  await page.locator("#step-6").getByRole("button", { name: "▶ Show step 6 in the simulation" }).click();
  await expect(page.locator(".msg-no")).toContainText("MSG 06");
  await expect(page).toHaveURL(/step=6/);
  await expect(page.locator("#main")).toBeInViewport();
});

test("quiz gives feedback and a score", async ({ page }) => {
  await page.goto(TOOL_USE);
  const q1 = page.locator(".quiz-q").first();
  await q1.getByRole("button", { name: "Your application code" }).click();
  await expect(q1.locator(".quiz-fb")).toContainText("Correct.");
  const q2 = page.locator(".quiz-q").nth(1);
  await q2.getByRole("button", { name: "The tool's ID" }).click();
  await expect(q2.locator(".quiz-fb")).toContainText("Not quite.");
  await expect(page.locator(".quiz-score")).toContainText("2 of 4 answered");
});

test("lab shows runnable Python and TypeScript", async ({ page }) => {
  await page.goto(TOOL_USE);
  const tabs = page.locator("#try-it").getByRole("tablist", { name: "Language" });
  await expect(page.locator("#code-panel pre")).toContainText("def execute(");
  await tabs.getByRole("tab", { name: "TypeScript" }).click();
  await expect(page.locator("#code-panel pre")).toContainText("export async function execute(");
});

test("glossary terms link to their definition on first use", async ({ page }) => {
  await page.goto(TOOL_USE);
  const link = page.locator(".article a.gl").first();
  await expect(link).toHaveAttribute("href", /\/glossary\/#/);
  await expect(link).toHaveAttribute("data-def", /.{20,}/);
});
