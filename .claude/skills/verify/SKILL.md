---
name: verify
description: Piloter un vrai navigateur (Playwright) pour vérifier une fonctionnalité de Bloop (login, DAW, séquenceur) plutôt que de deviner depuis le code.
---

# Vérifier Bloop dans un navigateur

Playwright est en devDependency du repo (`playwright` dans `package.json`, Chromium déjà installé via `npx playwright install chromium` — pas besoin de le refaire sauf nouvelle machine).

## Lancer le serveur

Le serveur dev (`npm run dev`, nodemon + Vite en HMR) doit tourner sur `http://localhost:3000`. S'il tourne déjà, les modifs de fichiers sont reflétées live sans redémarrage.

## Écrire un script de vérification

Copier `e2e/smoke.ts` comme point de départ. Les helpers réutilisables sont dans `e2e/helpers.ts` :

- `launchBrowser()` — lance Chromium avec les flags nécessaires (voir gotcha ci-dessous).
- `loginAsAdmin(page)` — se connecte avec le compte admin de dev (`DEFAULT_ADMIN_EMAIL`/`DEFAULT_ADMIN_PASSWORD` dans `.env`, jamais à hardcoder ni afficher).
- `BASE_URL` — `http://localhost:3000` par défaut, override via `E2E_BASE_URL`.

Exécuter avec `npx tsx e2e/mon-script.ts` (ou ajouter un script npm `e2e:xxx` si le script est amené à être réutilisé).

Le repo n'a pas `"type": "module"`, donc `tsx` transpile en CJS : pas de top-level `await`, tout mettre dans une fonction `async` appelée à la fin (voir `e2e/smoke.ts`).

## Gotcha : AudioContext bloqué en headless

Sans les flags `--autoplay-policy=no-user-gesture-required`, `--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream` (déjà dans `launchBrowser()`), le chargement du séquenceur reste bloqué indéfiniment à "Audio Context / Initialisation" : Chromium headless n'a pas de vrai périphérique audio et bloque l'autoplay sans geste utilisateur réel. Toujours passer par `launchBrowser()`, ne pas faire `chromium.launch()` nu.

## Gotcha : clics forcés = signal d'alarme

Si un clic Playwright normal échoue avec "element intercepts pointer events" alors que l'élément est visuellement correct, ne pas contourner avec `force: true` ou un dispatch DOM manuel sans creuser — c'est généralement un vrai bug d'interception (ex: overlay driver.js qui bloque les clics, cf. historique de `useOnboardingTour.ts`), pas un problème du test. Un `force: true` qui "fixe" le test masque le bug pour les vrais utilisateurs.

## Gotcha : timing des transitions d'état

Un script qui clique trop vite peut faire passer des bugs de cycle de vie (destroy/recreate, animations d'entrée) inaperçus. Ajouter des `waitForTimeout(500-800ms)` entre les actions qui déclenchent une transition d'état pour se rapprocher d'un rythme humain plutôt que d'enchaîner les clics instantanément.

## Nettoyage

Les screenshots/sorties de scripts ad hoc vont dans `e2e/.output/` (gitignoré) plutôt que `/tmp` ou le scratchpad, pour rester dans le repo entre les sessions.
