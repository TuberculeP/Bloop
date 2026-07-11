// Vérification visuelle Phase 3 (migration DAW : TimelineView, TrackRow,
// MasterTrackRow, MasterSettings, AudioLibraryPanel, PianoRoll, Messages).
// Usage : npx tsx e2e/verify-daw-phase3.ts
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

  await page.goto(`${BASE_URL}/app`);
  await page.waitForTimeout(800);

  const projectCard = page.locator(".project-card").first();
  if (await projectCard.count()) {
    await projectCard.click();
  } else {
    console.log("WARN: no project available, trying create button");
    const createBtn = page.getByRole("button", { name: /Nouveau projet|Créer/i }).first();
    if (await createBtn.count()) await createBtn.click();
  }
  await page.waitForURL(/\/app\/sequencer/, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(".timeline-view", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/20-timeline-view.png" });
  console.log("OK: timeline view screenshot");

  // Audio Library panel (tabs, empty states)
  const libraryBtn = page.getByRole("button", { name: /Audio Library/i });
  if (await libraryBtn.count()) {
    await libraryBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/.output/21-audio-library-panel.png" });
    console.log("OK: audio library panel screenshot");

    const personalTab = page.getByRole("button", { name: /Mes Samples/i });
    if (await personalTab.count()) {
      await personalTab.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "e2e/.output/22-audio-library-personal-empty.png" });
      console.log("OK: personal samples empty state screenshot");
    }
    await libraryBtn.click();
    await page.waitForTimeout(300);
  }

  // Add a track to inspect TrackRow/TrackHeader/PianoRoll
  const addTrackBtn = page.getByRole("button", { name: /Nouvelle piste/i });
  if (await addTrackBtn.count()) {
    await addTrackBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/23-add-track-menu.png" });
    console.log("OK: add track menu screenshot");

    const synthOption = page.locator(".instrument-option", { hasText: "Synth" }).first();
    if (await synthOption.count()) {
      await synthOption.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "e2e/.output/24-track-added.png" });
      console.log("OK: track added screenshot");

      // Expand piano roll via double click on the track preview
      const trackPreview = page.locator(".track-row").last();
      await trackPreview.dblclick({ position: { x: 100, y: 30 } }).catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: "e2e/.output/25-piano-roll.png" });
      console.log("OK: piano roll screenshot");

      // Rename modal
      const trackName = page.locator(".track-name").last();
      if (await trackName.count()) {
        await trackName.dblclick();
        await page.waitForTimeout(400);
        await page.screenshot({ path: "e2e/.output/26-rename-track-modal.png" });
        console.log("OK: rename track modal screenshot");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }

      // Delete via context menu -> confirm modal
      const trackHeader = page.locator(".track-header").last();
      await trackHeader.click({ button: "right" });
      await page.waitForTimeout(300);
      const deleteItem = page.locator(".dropdown-item", { hasText: "Supprimer" });
      if (await deleteItem.count()) {
        await deleteItem.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: "e2e/.output/27-delete-track-modal.png" });
        console.log("OK: delete track confirm modal screenshot");
        const confirmBtn = page.getByRole("button", { name: /^Supprimer$/i });
        if (await confirmBtn.count()) {
          await confirmBtn.click();
          await page.waitForTimeout(400);
        }
      }
    }
  }

  // Master settings panel (RangeSlider migration)
  const masterZone = page.locator(".master-track-zone, .master-track-row").first();
  if (await masterZone.count()) {
    const settingsBtn = page.locator(".master-track-row button, .master-track-row .settings-btn").first();
    if (await settingsBtn.count()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "e2e/.output/28-master-settings.png" });
      console.log("OK: master settings panel screenshot");
      const closeBtn = page.locator(".settings-panel .close-btn");
      if (await closeBtn.count()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }

  // Export modal
  const exportBtn = page.getByRole("button", { name: /Exporter/i }).first();
  if (await exportBtn.count()) {
    await exportBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "e2e/.output/29-export-modal.png" });
    console.log("OK: export modal screenshot");
    await page.keyboard.press("Escape");
  }

  // Messages page (ConversationSidebar / MessageThread spinners+empty states)
  await page.goto(`${BASE_URL}/messages`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/.output/30-messages.png" });
  console.log("OK: messages page screenshot");

  await browser.close();
};

run();
