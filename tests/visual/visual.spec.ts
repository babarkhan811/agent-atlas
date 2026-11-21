// Visual regression: key pages in both themes at phone, tablet, laptop (owner's 1280x560) and desktop sizes.
// Baselines are Linux PNGs created by .github/workflows/visual-baselines.yml; run with VISUAL=1.
import { expect, test } from "@playwright/test";

const PAGES = [
  ["lesson", "/learn/foundations/tool-use/?step=3"],
  ["learn", "/learn/"],
  ["guide", "/guide/automation-ladder/"],
] as const;
const SIZES = [[360, 800], [768, 1024], [1280, 560], [1440, 900]] as const;

for (const theme of ["dark", "light"] as const) {
  for (const [name, url] of PAGES) {
    for (const [w, h] of SIZES) {
      test(`${name} · ${theme} · ${w}x${h}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.emulateMedia({ reducedMotion: "reduce" }); // freeze ambient motion for stable pixels
        await page.goto(url + (url.includes("?") ? "&" : "?") + `theme=${theme}`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        await expect(page).toHaveScreenshot(`${name}-${theme}-${w}x${h}.png`, { animations: "disabled", maxDiffPixelRatio: 0.02 });
      });
    }
  }
}
