// Vérification visuelle Phase 5 (Blog, Profile, Auth) + résidus
// (durcissement stylelint, suppressions !important en Landing/DAW).
// Usage : npx tsx e2e/verify-phase5.ts
import "dotenv/config";
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  // Auth pages (logged out)
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/60-login.png" });
  console.log("OK: login screenshot");

  await page.goto(`${BASE_URL}/register`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/61-register.png" });
  console.log("OK: register screenshot");

  await page.goto(`${BASE_URL}/forgot-password`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/62-forgot-password.png" });
  console.log("OK: forgot-password screenshot");

  // Now log in for blog/profile
  await loginAsAdmin(page);
  await page.evaluate(() => {
    localStorage.setItem("bloop-onboarding-seen", "true");
    localStorage.setItem("bloop-onboarding-completed", "true");
  });

  await page.goto(`${BASE_URL}/blog`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/63-blog.png" });
  console.log("OK: blog screenshot");

  await page.goto(`${BASE_URL}/blog/search?q=test`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/64-blog-search.png" });
  console.log("OK: blog search results screenshot");

  await page.goto(`${BASE_URL}/profile`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/65-profile.png" });
  console.log("OK: profile screenshot");

  const tabs = page.locator(".tab-btn, [class*='tab']");
  const postsTab = page.getByText(/mes posts|posts/i).first();
  if (await postsTab.count()) {
    await postsTab.click().catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: "e2e/.output/66-profile-posts.png" });
    console.log("OK: profile posts tab screenshot");
  }

  // Re-verify DAW + Landing after !important removals
  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(800);
  const projectCard = page.locator(".project-card").first();
  if (await projectCard.count()) {
    await projectCard.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "e2e/.output/67-project-selector-hover.png" });
    console.log("OK: project selector favorite/delete hover screenshot");
  }

  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "e2e/.output/68-landing-final.png" });
  console.log("OK: landing final screenshot");

  await browser.close();
};

run();
