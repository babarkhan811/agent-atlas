// One regression test per bug in §1 of the product brief.
import { expect, test } from "@playwright/test";

const MCP = "/learn/knowledge-protocols/mcp/";
const LLM = "/learn/foundations/llm-call/";

test("bug 1: Space on a focused button activates that button, not autoplay", async ({ page }) => {
  await page.goto(LLM);
  const stepBtn = page.getByRole("button", { name: "STEP ›" });
  await stepBtn.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".msg-no")).toContainText("MSG 02");
  await expect(page.getByRole("button", { name: "▶ PLAY" })).toBeVisible();
  // Space with nothing interactive focused still toggles playback.
  await page.locator(".ov-sum").click();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "❚❚ PAUSE" })).toBeVisible();
});

test("bug 2: bad step values are handled; unknown lessons 404", async ({ page }) => {
  await page.goto(`${LLM}?step=abc`);
  await expect(page.locator(".msg-no")).toContainText("MSG 01");
  await page.goto(`${LLM}?step=999`);
  await expect(page.locator(".msg-no")).toContainText("MSG 06 / 06");
  const res = await page.goto("/learn/security/not-a-lesson/");
  expect(res?.status()).toBe(404);
});

test("bug 3: search covers step content and the glossary", async ({ page }) => {
  await page.goto(LLM);
  const box = page.getByRole("searchbox", { name: "Search lessons and glossary" });
  await box.fill("JSON-RPC");
  const hit = page.locator(".list a.li", { hasText: "MCP: Model Context Protocol" });
  await expect(hit).toBeVisible();
  await expect(hit).toHaveAttribute("href", /\/mcp\/\?step=1$/);
  await box.fill("temperature");
  await expect(page.locator(".list a.li.term", { hasText: "Temperature" })).toBeVisible();
});

test("bug 4: the view is part of a shareable URL", async ({ page }) => {
  await page.goto(MCP);
  await page.getByRole("tab", { name: "≡ SEQUENCE" }).click();
  await expect(page).toHaveURL(/view=sequence/);
  await page.reload();
  await expect(page.getByRole("tab", { name: "≡ SEQUENCE" })).toHaveAttribute("aria-selected", "true");
});

test("bug 6: nothing claims to be live; estimates are labelled", async ({ page }) => {
  await page.goto(LLM);
  await expect(page.locator(".badge")).toHaveText("SIMULATION");
  await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "SIZE (EST.)" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "TIME (EST.)" })).toBeVisible();
});

test("bug 7: a lesson page ships only its own lesson and self-hosted fonts", async ({ request }) => {
  const html = await (await request.get(LLM)).text();
  expect(html).toContain("Explain webhooks in one sentence");          // own content
  expect(html).not.toContain("MCP messages are JSON-RPC 2.0");         // another lesson's step text
  expect(html).not.toContain("fonts.googleapis.com");
});

test("bug 8: keyboard access: skip link, view tabs, focusable diagram nodes", async ({ page }) => {
  await page.goto(MCP);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  const net = page.getByRole("tab", { name: "◆ NETWORK" });
  await net.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "≡ SEQUENCE" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "≡ SEQUENCE" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");

  const github = page.getByRole("button", { name: "GitHub API API" });
  await github.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg-no")).toContainText("MSG 08");       // first message involving GitHub API
  await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
});

test("bug 8: shows ⌘K on macOS and Ctrl K elsewhere", async ({ page }) => {
  await page.goto(LLM);
  await expect(page.locator(".search kbd")).toHaveText("Ctrl K");
  await page.addInitScript(() => Object.defineProperty(navigator, "platform", { get: () => "MacIntel" }));
  await page.reload();
  await expect(page.locator(".search kbd")).toHaveText("⌘K");
});

test("bug 9: canonical URL, sitemap and robots", async ({ page, request }) => {
  await page.goto(MCP);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/learn\/knowledge-protocols\/mcp\/$/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap.match(/<loc>/g)?.length).toBe(24);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test.fixme("bug 10: Pro content never reaches unentitled users (server-side gating ships in M5)", async () => {});

test("bug 11: the guide's sample handles unknown tools and rate limits", async ({ page }) => {
  await page.goto("/guide/");
  const code = page.locator("#code pre");
  await expect(code).toContainText("unknown tool");
  await expect(code).toContainText("hourly limit reached");
  await expect(code).toContainText("def validate(");
});

test("bug 12: tighter autoplay pacing and a draggable timeline", async ({ page }) => {
  await page.goto(LLM);
  await page.getByRole("button", { name: "▶ PLAY" }).click();
  const t0 = Date.now();
  await expect(page.locator(".msg-no")).toContainText("MSG 02", { timeout: 3500 });
  expect(Date.now() - t0).toBeLessThan(3000);
  await page.getByRole("button", { name: "❚❚ PAUSE" }).click();
  await page.getByRole("slider", { name: "Timeline" }).fill("5");
  await expect(page.locator(".msg-no")).toContainText("MSG 05");
});

test("layout: short laptop screens (1280x560 viewport) keep the diagram visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/learn/security/soc-triage/?step=2");
  const diagram = await page.locator("svg.diagram").boundingBox();
  const caption = await page.locator(".caption").boundingBox();
  expect(diagram!.height).toBeGreaterThanOrEqual(280);
  expect(caption!.y).toBeGreaterThanOrEqual(diagram!.y + diagram!.height - 2); // caption sits below, not on top
  await page.locator(".trace").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "▶ PLAY" })).toBeInViewport();
});

test("layout: opening a lesson does not scroll the page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/learn/security/access-review/?step=3");
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
