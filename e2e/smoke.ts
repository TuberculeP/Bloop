// Smoke test manuel : connexion + chargement du séquenceur.
// Usage : npm run e2e:smoke
// Sert aussi de modèle pour écrire un nouveau script de vérification :
// copier ce fichier, importer les helpers, piloter la page avec Playwright.
import { launchBrowser, loginAsAdmin, BASE_URL } from "./helpers";

const run = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await loginAsAdmin(page);
  await page.goto(`${BASE_URL}/app`);
  await page.waitForSelector(".project-card, .state-container", {
    timeout: 20000,
  });

  console.log("OK: connexion + /app chargé sans erreur");
  await browser.close();
};

run();
