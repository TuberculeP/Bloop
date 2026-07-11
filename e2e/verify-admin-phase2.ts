// Vérification visuelle Phase 2 (migration complète zone Admin).
// Usage : npx tsx e2e/verify-admin-phase2.ts
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

  // AdminUsers
  await page.goto(`${BASE_URL}/admin/users`);
  await page.waitForSelector(".admin-users", { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/10-admin-users.png" });
  console.log("OK: admin users screenshot");

  const deactivateBtn = page.getByRole("button", { name: /Deactivate/i }).first();
  if (await deactivateBtn.count()) {
    await deactivateBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/11-admin-users-deactivate-modal.png" });
    console.log("OK: deactivate confirm modal screenshot");
    await page.getByRole("button", { name: /^Cancel$/i }).click();
    await page.waitForTimeout(300);
  }

  // AdminSamples -> AdminPackDetail
  await page.goto(`${BASE_URL}/admin/samples`);
  await page.waitForSelector(".admin-samples", { timeout: 15000 });
  const packCard = page.locator(".pack-card").first();
  if (await packCard.count()) {
    await packCard.click();
    await page.waitForURL(/\/admin\/samples\/.+/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: "e2e/.output/12-admin-pack-detail.png" });
    console.log("OK: admin pack detail screenshot");

    const newFolderBtn = page.getByRole("button", { name: /New Folder/i });
    if (await newFolderBtn.count()) {
      await newFolderBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "e2e/.output/13-admin-create-folder-modal.png" });
      console.log("OK: create folder modal screenshot");
      await page.getByRole("button", { name: /^Cancel$/i }).click();
      await page.waitForTimeout(300);
    }

    const folderItem = page.locator(".folder-item").first();
    if (await folderItem.count()) {
      await folderItem.click();
      await page.waitForURL(/\/admin\/samples\/.+\/folders\/.+/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.screenshot({ path: "e2e/.output/14-admin-folder-detail.png" });
      console.log("OK: admin folder detail screenshot");
    }
  } else {
    console.log("WARN: no pack available to open");
  }

  await browser.close();
};

run();
