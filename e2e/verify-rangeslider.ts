// Vérification visuelle du RangeSlider dans InstrumentSettings (volume/reverb + ADSR).
// Usage : npx tsx e2e/verify-rangeslider.ts
import "dotenv/config";
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await loginAsAdmin(page);
  // Le tour d'onboarding driver.js s'affiche pour tout nouvel utilisateur et bloque
  // les clics via son overlay tant qu'il n'est pas marqué comme vu (cf. useOnboardingTour.ts).
  await page.evaluate(() => {
    localStorage.setItem("bloop-onboarding-seen", "true");
    localStorage.setItem("bloop-onboarding-completed", "true");
  });
  await page.goto(`${BASE_URL}/app`);
  await page.waitForSelector(".project-card, .state-container", {
    timeout: 20000,
  });

  const firstProject = page.locator(".project-card").first();
  if (await firstProject.count()) {
    await firstProject.click();
    await page.waitForURL(/\/app\/.+/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Ajouter une piste Undertale : instrument avec ADSR (4 RangeSliders) + volume/reverb
    const addTrackBtn = page.getByRole("button", { name: /Nouvelle piste/i });
    await addTrackBtn.click();
    await page.waitForTimeout(400);
    const undertaleOption = page.locator(".instrument-option", {
      hasText: "Undertale",
    });
    await undertaleOption.click();
    await page.waitForTimeout(800);

    // Bouton engrenage de la dernière piste ajoutée (Undertale) : .track-settings-btn (TrackHeader.vue)
    await page.locator(".track-settings-btn").last().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "e2e/.output/07-instrument-settings.png" });
    console.log("OK: instrument settings screenshot");

    // Nettoyage : fermer le panneau d'instrument puis supprimer la piste Undertale créée pour le test
    await page.locator(".close-settings-btn").click();
    await page.waitForTimeout(300);
    await page.locator(".more-btn").last().click();
    await page.waitForTimeout(300);
    await page.getByText("Supprimer", { exact: true }).click();
    await page.waitForTimeout(400);
    console.log("OK: test track cleaned up");
  } else {
    console.log("WARN: no project available to open");
  }

  await browser.close();
};

run();
