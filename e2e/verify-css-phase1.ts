// Vérification visuelle Phase 1 (librairie de composants CSS) :
// LoginForm (FormField/BaseInput), ProjectSelector (BaseModal, ui-card),
// AdminSamples (BaseButton accent2/outline, BaseBadge, BaseModal, EmptyState, BaseSpinner).
// Usage : npx tsx e2e/verify-css-phase1.ts
import "dotenv/config";
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("CONSOLE ERROR:", msg.text());
  });

  // 1. Page de login (FormField + BaseInput)
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector(".login-form");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "e2e/.output/01-login-form.png" });
  console.log("OK: login form screenshot");

  // 2. Connexion admin + dashboard projets (BaseModal delete confirm, ui-card)
  await loginAsAdmin(page);
  await page.goto(`${BASE_URL}/app`);
  await page.waitForSelector(".project-card, .state-container", {
    timeout: 20000,
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/02-project-selector.png" });
  console.log("OK: project selector screenshot");

  // 3. Admin samples (badges, boutons accent2/outline, empty state / spinner)
  await page.goto(`${BASE_URL}/admin/samples`);
  await page.waitForSelector(".admin-samples", { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/03-admin-samples.png" });
  console.log("OK: admin samples screenshot");

  // 4. Ouvrir la modale d'import (BaseModal size=large)
  const importBtn = page.getByRole("button", { name: /Import Pack/i });
  if (await importBtn.count()) {
    await importBtn.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/04-import-modal.png" });
    console.log("OK: import modal screenshot");
    await page.keyboard.press("Escape").catch(() => {});
    await page.mouse.click(5, 5);
    await page.waitForTimeout(300);
  }

  // 5. Ouvrir la modale d'édition d'un pack si un pack existe (FormField/BaseInput)
  const editBtn = page.getByRole("button", { name: /^Edit$/i }).first();
  if (await editBtn.count()) {
    await editBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/05-edit-modal.png" });
    console.log("OK: edit modal screenshot");
    const cancelBtn = page.getByRole("button", { name: /^Cancel$/i });
    if (await cancelBtn.count()) await cancelBtn.first().click();
    await page.waitForTimeout(300);
  }

  // 6. Ouvrir la modale de suppression si un pack existe (confirm() remplacé)
  const deleteBtn = page.getByRole("button", { name: /^Delete$/i }).first();
  if (await deleteBtn.count()) {
    await deleteBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/06-delete-confirm-modal.png" });
    console.log("OK: delete confirm modal screenshot");
  }

  await browser.close();
};

run();
