// Vérification visuelle du composant LandingCtaButton (extraction partagée
// entre LandingHeader et LandingContain, fix du bug btn-shine mort).
// Usage : npx tsx e2e/verify-landing-cta.ts
import "dotenv/config";
import { launchBrowser, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "e2e/.output/40-landing-header-cta.png" });
  console.log("OK: landing header (Inscription CTA) screenshot");

  await page.locator(".hero-actions").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/41-landing-hero-cta.png" });
  console.log("OK: landing hero CTA screenshot");

  // Hover to confirm the shine animation now plays
  const heroCta = page.locator(".hero-actions .landing-cta-button").first();
  await heroCta.hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "e2e/.output/42-landing-hero-cta-hover.png" });
  console.log("OK: landing hero CTA hover (shine) screenshot");

  const ctaSection = page.locator(".cta-actions .landing-cta-button").first();
  if (await ctaSection.count()) {
    await ctaSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await ctaSection.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e/.output/43-landing-cta-section-hover.png" });
    console.log("OK: landing lower CTA section hover screenshot");
  }

  await browser.close();
};

run();
