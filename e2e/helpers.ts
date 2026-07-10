import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";

export const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

// Sans ces flags, l'AudioContext de la DAW reste bloqué à l'initialisation
// en navigateur headless (pas de vrai périphérique audio, autoplay policy
// qui attend un geste utilisateur qui n'arrive jamais).
export const launchBrowser = (): Promise<Browser> =>
  chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });

export const loginAsAdmin = async (page: Page): Promise<void> => {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD manquants (voir .env)",
    );
  }
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app|$)/, { timeout: 15000 }).catch(() => {});
};
