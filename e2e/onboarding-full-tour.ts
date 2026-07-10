// Vérifie le tour guidé complet : création projet -> piste Sampler ->
// réglages (flûte) -> notes -> renommage -> play -> save -> export
// (choix du format dans la modale) -> confirm-export.
// Usage : npx tsx e2e/onboarding-full-tour.ts
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";
import type { Page } from "playwright";

const popoverTitle = (page: Page) =>
  page
    .locator(".driver-popover-title")
    .innerText()
    .catch(() => null);

const wait = (page: Page) => page.waitForTimeout(700);

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await loginAsAdmin(page);

  await page.goto(`${BASE_URL}/app`);
  await page.evaluate(() => {
    localStorage.removeItem("bloop-onboarding-seen");
    localStorage.removeItem("bloop-onboarding-completed");
  });
  await page.reload();

  await page.waitForSelector(".driver-popover", { timeout: 20000 });
  console.log("1. create-project ->", await popoverTitle(page));

  await wait(page);
  await page.click(".new-project-btn");
  await page.waitForURL(/\/app\/sequencer/, { timeout: 15000 });

  await page.waitForSelector(
    ".add-track-wrapper .driver-popover, .driver-popover",
    {
      timeout: 15000,
    },
  );
  console.log("2. add-track ->", await popoverTitle(page));

  await wait(page);
  await page.click(".add-track-btn");
  await page.waitForSelector(".instrument-menu", { timeout: 10000 });

  // Régression : un instrument non-Sampler doit être rejeté (piste supprimée,
  // retour au step add-track) avant de rejouer le vrai scénario Sampler.
  await wait(page);
  await page.click('.instrument-option:has-text("Synth")');
  await wait(page);
  const tracksAfterWrongPick = await page.locator(".track-row").count();
  console.log(
    "2b. régression add-instrument (mauvais choix) -> pistes visibles:",
    tracksAfterWrongPick,
    "titre:",
    await popoverTitle(page),
  );

  await wait(page);
  await page.click(".add-track-btn");
  await page.waitForSelector(".instrument-menu", { timeout: 10000 });
  await wait(page);
  await page.click('.instrument-option:has-text("Sampler")');

  await page.waitForSelector(".track-settings-btn", { timeout: 10000 });
  console.log("3. open-settings ->", await popoverTitle(page));

  await wait(page);
  await page.click(".track-settings-btn");
  await page.waitForSelector(".instrument-select", { timeout: 10000 });
  console.log("4. select-instrument ->", await popoverTitle(page));

  await wait(page);
  await page.selectOption(".instrument-select", "flute");
  await page.waitForSelector(".close-settings-btn", { timeout: 10000 });
  console.log("5. close-settings ->", await popoverTitle(page));

  await wait(page);
  await page.click(".close-settings-btn");
  await page.waitForSelector(".settings-overlay", {
    state: "detached",
    timeout: 10000,
  });

  await wait(page);
  await page.dblclick(".track-row");
  await page.waitForSelector(".piano-grid-canvas", { timeout: 10000 });
  console.log("6. add-notes ->", await popoverTitle(page));

  const grid = page.locator(".piano-grid-canvas");
  for (let i = 0; i < 3; i++) {
    await grid.click({ position: { x: 60 + i * 40, y: 200 } });
    await page.waitForTimeout(300);
  }

  await wait(page);
  console.log("7. rename-project ->", await popoverTitle(page));

  await wait(page);
  await page.dblclick(".project-name");
  await page.fill(".project-name-input", "Mask_Off");
  await page.keyboard.press("Enter");

  await page.waitForSelector(".play-btn", { timeout: 10000 });
  console.log("8. play ->", await popoverTitle(page));

  await wait(page);
  await page.click(".play-btn");
  await page.waitForSelector(".play-btn.playing", { timeout: 10000 });

  await page.waitForSelector(".save-project-btn", { timeout: 10000 });
  console.log("9. save ->", await popoverTitle(page));

  await wait(page);
  await page.click(".save-project-btn");

  await wait(page);
  console.log("10. export ->", await popoverTitle(page));

  await wait(page);
  await page.click(".export-audio-btn");
  await page.waitForSelector(".export-format-modal", { timeout: 10000 });
  console.log("11. confirm-export ->", await popoverTitle(page));

  await wait(page);
  await page.click(".export-confirm-btn");
  await page.waitForSelector(".export-overlay", {
    state: "detached",
    timeout: 30000,
  });

  await page.waitForSelector(".driver-popover", {
    state: "detached",
    timeout: 10000,
  });

  const completed = await page.evaluate(() =>
    localStorage.getItem("bloop-onboarding-completed"),
  );
  console.log("bloop-onboarding-completed =", completed);

  const popoverCount = await page.locator(".driver-popover").count();
  console.log("popovers résiduels dans le DOM:", popoverCount);

  console.log(completed === "true" && popoverCount === 0 ? "OK" : "FAIL");
  await browser.close();
};

run();
