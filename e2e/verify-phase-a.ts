// Vérification visuelle Phase A (nettoyage DRY rétrospectif) :
// SessionExpiredModal -> BaseModal, UserSamplesPanel -> BaseModal/EmptyState,
// ProjectSelector .btn-outline -> BaseButton, BlogSearchResults empty states.
// Usage : npx tsx e2e/verify-phase-a.ts
import "dotenv/config";
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await loginAsAdmin(page);
  await page.evaluate(() => {
    localStorage.setItem("bloop-onboarding-seen", "true");
    localStorage.setItem("bloop-onboarding-completed", "true");
  });

  // ProjectSelector : empty states "favoris"/"découvrir" avec BaseButton ghost
  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/.output/70-project-selector.png" });

  const favTab = page.getByText("Favoris", { exact: true }).first();
  if (await favTab.count()) {
    await favTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "e2e/.output/71-project-favorites-empty.png" });
  }
  console.log("OK: project selector screenshots");

  // Profile > samples panel (UserSamplesPanel)
  await page.goto(`${BASE_URL}/profile`);
  await page.waitForTimeout(800);
  const samplesTab = page.getByText(/samples/i).first();
  if (await samplesTab.count()) {
    await samplesTab.click().catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: "e2e/.output/72-user-samples-panel.png" });
    console.log("OK: user samples panel screenshot");
  }

  // Blog search results empty states
  await page.goto(`${BASE_URL}/blog/search?q=`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/.output/73-blog-search-empty.png" });
  await page.goto(`${BASE_URL}/blog/search?q=zzzznoresultzzzz`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/.output/74-blog-search-noresults.png" });
  console.log("OK: blog search results screenshots");

  await browser.close();
};

run();
