// Nettoyage : supprime la piste de test "Synth 1" ajoutée par verify-daw-phase3.ts
import "dotenv/config";
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await loginAsAdmin(page);
  await page.evaluate(() => {
    localStorage.setItem("bloop-onboarding-seen", "true");
    localStorage.setItem("bloop-onboarding-completed", "true");
  });

  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(800);
  const projectCard = page.locator(".project-card").first();
  if (await projectCard.count()) await projectCard.click();
  await page.waitForURL(/\/app\/sequencer/, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(".timeline-view", { timeout: 15000 });
  await page.waitForTimeout(800);

  const trackHeader = page.locator(".track-header", { hasText: "Synth 1" });
  if (await trackHeader.count()) {
    await trackHeader.click({ button: "right" });
    await page.waitForTimeout(300);
    const deleteItem = page.locator(".dropdown-item", { hasText: "Supprimer" });
    if (await deleteItem.count()) {
      await deleteItem.click();
      await page.waitForTimeout(400);
      const confirmBtn = page.getByRole("button", { name: /^Supprimer$/i });
      if (await confirmBtn.count()) {
        await confirmBtn.click();
        await page.waitForTimeout(400);
      }
      console.log("OK: test track removed");
    }
  } else {
    console.log("No test track found, nothing to clean up");
  }

  await browser.close();
};

run();
