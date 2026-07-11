// Vérification visuelle Phase 4 (migration Landing : LandingCtaButton,
// BaseTooltip, click-outside profil, scrollbar, tokens navy).
// Usage : npx tsx e2e/verify-landing-phase4.ts
import "dotenv/config";
import { launchBrowser, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "e2e/.output/44-landing-full-header.png" });
  console.log("OK: landing header screenshot");

  // Footer social tooltips
  await page.locator(".social-links").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const firstSocial = page.locator(".social-link").first();
  await firstSocial.hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "e2e/.output/45-footer-social-tooltip.png" });
  console.log("OK: footer social tooltip screenshot");

  // Mobile viewport check (breakpoints untouched, sanity check)
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/46-landing-mobile.png" });
  console.log("OK: landing mobile viewport screenshot");

  await browser.close();
};

run();
