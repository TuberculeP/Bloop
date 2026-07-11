// Vérification post-refactor de TimelineView.vue (extraction en composables).
// Usage : npx tsx e2e/verify-timelineview-refactor.ts
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error")
      consoleErrors.push(`CONSOLE ERROR: ${msg.text()}`);
  });

  // Désactive le tour d'onboarding (driver.js) qui bloquerait les clics du script :
  // il se relance tant que ces deux flags localStorage ne sont pas posés.
  await page.addInitScript(() => {
    localStorage.setItem("bloop-onboarding-seen", "true");
    localStorage.setItem("bloop-onboarding-completed", "true");
  });

  await loginAsAdmin(page);
  await page.goto(`${BASE_URL}/app`);
  await page.waitForSelector(
    ".project-card, .new-project-btn, .state-container",
    {
      timeout: 20000,
    },
  );

  const projectCard = page.locator(".project-card").first();
  if (await projectCard.count()) {
    console.log("Ouverture d'un projet existant...");
    await projectCard.click();
  } else {
    console.log("Aucun projet existant, création d'un nouveau projet...");
    await page.locator(".new-project-btn").first().click();
  }

  await page.waitForSelector(".timeline-view", { timeout: 20000 });
  await page.waitForTimeout(1500);
  console.log("OK: TimelineView chargé");

  // 1) Ajouter une piste MIDI pour avoir des notes à jouer
  await page.screenshot({ path: "e2e/.output/01-timeline-loaded.png" });

  await page.locator(".add-track-btn").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "e2e/.output/02-add-track-menu.png" });
  const firstInstrumentOption = page.locator(".instrument-option").first();
  if (await firstInstrumentOption.count()) {
    await firstInstrumentOption.click();
    console.log("OK: piste ajoutée");
  } else {
    console.log(
      "ATTENTION: menu d'ajout de piste non trouvé avec les sélecteurs attendus",
    );
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/.output/03-after-add-track.png" });

  // Ajouter 3 notes sur la piste via le piano roll (double-clic pour l'ouvrir)
  const trackRow = page.locator(".track-row").first();
  if (await trackRow.count()) {
    await trackRow.dblclick();
    await page.waitForTimeout(500);
    const pianoGrid = page.locator(".piano-grid-canvas").first();
    if (await pianoGrid.count()) {
      await pianoGrid.click({ position: { x: 40, y: 200 } });
      await page.waitForTimeout(150);
      await pianoGrid.click({ position: { x: 80, y: 220 } });
      await page.waitForTimeout(150);
      await pianoGrid.click({ position: { x: 120, y: 240 } });
      console.log("OK: 3 notes posées sur le piano roll");
    } else {
      console.log("ATTENTION: piano roll non trouvé après double-clic");
    }
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e/.output/03b-after-add-notes.png" });

  // 2) Play/Stop via le bouton transport
  const playBtn = page.locator(".play-btn");
  await playBtn.click();
  await page.waitForTimeout(700);
  const isPlayingClass = await playBtn.evaluate((el) =>
    el.classList.contains("playing"),
  );
  console.log(`Play cliqué - classe 'playing' présente: ${isPlayingClass}`);
  const positionText1 = await page.locator(".position-display").textContent();
  await page.waitForTimeout(800);
  const positionText2 = await page.locator(".position-display").textContent();
  console.log(
    `Position avant: ${positionText1} / après 800ms: ${positionText2}`,
  );
  await page.screenshot({ path: "e2e/.output/04-playing.png" });

  await playBtn.click();
  await page.waitForTimeout(300);
  const isStoppedClass = await playBtn.evaluate(
    (el) => !el.classList.contains("playing"),
  );
  console.log(`Stop cliqué - lecture arrêtée: ${isStoppedClass}`);

  // 2b) Espace pour toggle playback (raccourci clavier)
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  const isPlayingViaSpace = await playBtn.evaluate((el) =>
    el.classList.contains("playing"),
  );
  console.log(`Espace toggle playback - en lecture: ${isPlayingViaSpace}`);
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);

  // 3) Seek en cliquant sur le ruler
  const ruler = page.locator(".ruler-measures").first();
  if (await ruler.count()) {
    const box = await ruler.boundingBox();
    if (box) {
      await ruler.click({ position: { x: 100, y: box.height / 2 } });
      await page.waitForTimeout(300);
      const positionAfterSeek = await page
        .locator(".position-display")
        .textContent();
      console.log(`Position après seek sur le ruler: ${positionAfterSeek}`);
    }
  } else {
    console.log("ATTENTION: ruler non trouvé");
  }
  await page.screenshot({ path: "e2e/.output/05-after-seek.png" });

  // 4) Renommer le projet + sauvegarder
  const projectName = page.locator(".project-name");
  await projectName.dblclick();
  await page.waitForTimeout(200);
  const nameInput = page.locator(".project-name-input");
  if (await nameInput.count()) {
    await nameInput.fill("Timeline Refactor Check");
    await nameInput.press("Enter");
    await page.waitForTimeout(300);
    const renamedText = await page.locator(".project-name").textContent();
    console.log(`Nom du projet après renommage: ${renamedText}`);
  } else {
    console.log("ATTENTION: input de renommage non trouvé");
  }

  const saveBtn = page.locator(".save-project-btn");
  await saveBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "e2e/.output/06-after-save.png" });
  console.log("OK: bouton Sauvegarder cliqué");

  // 5) Modale d'export
  const exportBtn = page.locator(".export-audio-btn");
  await exportBtn.click();
  await page.waitForTimeout(400);
  const modalVisible = await page
    .locator(".export-format-modal")
    .isVisible()
    .catch(() => false);
  console.log(`Modale export visible: ${modalVisible}`);
  const wavOption = page.locator(".export-format-option", { hasText: "WAV" });
  const mp3Option = page.locator(".export-format-option", { hasText: "MP3" });
  console.log(
    `Options export présentes - WAV: ${await wavOption.count()}, MP3: ${await mp3Option.count()}`,
  );
  await page.screenshot({ path: "e2e/.output/07-export-modal.png" });

  const cancelBtn = page.locator(".export-cancel-btn");
  await cancelBtn.click();
  await page.waitForTimeout(300);

  console.log(`\nErreurs console/page capturées: ${consoleErrors.length}`);
  consoleErrors.forEach((e) => console.log(` - ${e}`));

  await browser.close();
};

run();
