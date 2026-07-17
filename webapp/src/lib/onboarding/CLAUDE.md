# Onboarding guidé

> Tour pas-à-pas (driver.js) qui guide un nouvel utilisateur de la création d'un projet jusqu'à l'export du premier morceau. Progression pilotée uniquement par l'état réel de l'app (Pinia, DOM) — jamais par des boutons "Suivant"/"Précédent" du tour.

## Architecture

```
lib/onboarding/steps.ts            # data pure : les étapes (id, route, sélecteur, titre, description)
stores/onboardingStore.ts          # état + persistance localStorage + orchestration start/advance/complete/skip
composables/useOnboardingTour.ts   # pont impératif driver.js <-> watchers Pinia de validation
styles/onboarding.css              # thème driver.js + overrides de comportement
```

- **`onboardingStore.ts`** : `currentStepIndex`, `targetTrackId` (piste créée pendant le tour), deux flags localStorage distincts : `bloop-onboarding-seen` (posé au lancement, empêche la relance auto même si abandon) et `bloop-onboarding-completed` (posé uniquement à la fin réelle). `start()` regarde la route courante pour démarrer à l'étape 0 ou 1.
- **`useOnboardingTour()`** : instancié une seule fois dans `App.vue` (survit à la navigation `/app` <-> `/app/sequencer`). Contient tous les `watch()` sur le state réel (`timelineStore`, `projectStore`) qui appellent `advance()`, plus des helpers de polling DOM (`waitForElement`, `waitForElementGone`, `waitForPositionSettle`) pour les cas où l'état pertinent n'est pas dans un store.
- **`steps.ts`** : uniquement des données. Le champ optionnel `expandedSelector` sert quand l'élément réellement highlighté n'existe qu'après une interaction dynamique (ex: le piano roll n'apparaît qu'après double-clic sur la piste).

## Les 12 étapes

`create-project` → `add-track` → `add-instrument` (Sampler uniquement) → `open-settings` → `select-instrument` (flûte) → `close-settings` → `add-notes` (3 notes) → `rename-project` → `play` → `save` → `export` → `confirm-export`.

`export` highlight le bouton header (`.export-audio-btn`) qui ouvre la modale de choix de format ; `confirm-export` highlight la modale elle-même (`.export-format-modal`, tous ses enfants restent cliquables puisqu'ils sont dans l'élément actif de driver.js) et avance via le même watcher `lastExportedAt` qu'avant. Si l'utilisateur clique "Annuler", `waitForExportModalClose` redétecte l'absence d'overlay de progression et revient à l'étape `export` plutôt que de rester bloqué.

Aucun bouton de navigation sur le popover (`.driver-popover-footer{display:none}` en CSS masque Previous/Next/Done) : chaque étape avance via un `watch()` sur du state réel, jamais sur un clic de bouton du tour lui-même. Seul le bouton "close" (×, coin haut-droit de chaque bulle) reste actif, via `showButtons: ["close"]` + `onCloseClick` posés directement sur l'objet `popover` passé à `highlight()` dans `useOnboardingTour.ts` (**pas** sur la config globale `driver({...})` : l'API impérative `Driver.highlight()` écrase toujours `showButtons` à `[]` si le popover ne le précise pas lui-même, elle ignore la config globale sur ce point précis — cf. `highlight:` dans `driver.js.mjs`). `onCloseClick` appelle `onboardingStore.skip()`, ce qui permet de quitter le tour à tout moment sans dépendre d'`allowClose` (qui reste `false` pour bloquer la fermeture accidentelle via Echap/clic sur l'overlay).

## Ajouter une étape

1. Ajouter l'`id` à `OnboardingStepId` et l'entrée dans `ONBOARDING_STEPS` (`steps.ts`).
2. Dans `useOnboardingTour.ts`, ajouter le `watch()`/helper qui appelle `advance()` quand l'action est réellement effectuée. Utiliser `stepIndex("mon-id")` (jamais un index en dur) pour les gardes `currentStepIndex !== ...`.
3. Si le sélecteur cible n'existe pas encore dans le DOM au moment du render, ajouter une classe CSS dédiée sur l'élément plutôt que de réutiliser une classe existante potentiellement ambiguë (voir gotchas ci-dessous).

## Gotchas driver.js (rencontrés en prod, pas hypothétiques)

- **Toujours détruire et recréer une instance fraîche** (`highlight()` fait `destroyDriver()` puis `driver({...}).highlight(...)`) plutôt que réutiliser `setSteps()+drive()` — cette dernière approche a laissé un popover fantôme en DOM lors d'un retarget vers un élément différent.
- **Ne jamais utiliser le callback `onDestroyed`** pour détecter un abandon : il se déclenche aussi quand *notre propre code* détruit l'instance pour retargeter une étape (dès que la transition d'entrée précédente a eu le temps de se terminer), pas seulement sur une fermeture utilisateur.
- **Élément qui disparaît puis réapparaît (menu, dropdown)** : si on relance un `waitForElement(selector)` juste après que l'élément a disparu, il peut encore être dans le DOM (animation de sortie Vue `<Transition>`) et se résoudre instantanément sur l'élément *en train de partir*. Toujours `waitForElementGone(selector)` avant de re-guetter une apparition (voir `waitForInstrumentMenu`).
- **Un `v-if`/`v-else` qui remplace l'élément ciblé par un autre nœud** (ex: `<span>` → `<input>` au double-clic pour renommer) casse le ciblage : driver.js garde la référence à l'ancien nœud détaché, et bloque clics/interactions sur le nouveau (hors zone active). Il faut retargeter explicitement dès que le nouvel élément apparaît, et revenir en arrière s'il disparaît sans transition d'état (voir `waitForRenameInput`).
- **Un voisin flex qui change de taille décale l'élément ciblé** : un bouton dans un conteneur `justify-content: flex-end` dont le contenu change (ex: "Sauvegarder" → "Projet sauvegardé" pendant 3s) décale tous ses voisins. Le spotlight, mesuré au moment du `highlight()`, reste figé à l'ancienne position pendant la transition. Fix générique : mesurer la position initiale, attendre qu'elle change puis se stabilise (`waitForPositionSettle`), puis recaler le spotlight une seule fois — sans repasser par `renderStep()` (qui réarmerait l'attente indéfiniment).
- **`.control-btn.settings-btn` n'est pas unique** : `MasterTrackHeader.vue` partage cette combinaison de classes avec `TrackHeader.vue`. `page.click()`/tout ciblage par classe générique doit être vérifié pour ambiguïté — préférer une classe dédiée (`.track-settings-btn`) plutôt que de réutiliser une classe de style partagée.
- **`stagePadding`/`stageRadius`** : l'algorithme SVG de driver.js dessine un rectangle arrondi ; comparer visuellement au lieu de recalculer le path à la main (le point de départ du path n'est pas le coin de la bounding box, c'est un point décalé par le rayon d'arrondi — piège pour qui essaie de vérifier l'alignement en lisant l'attribut `d`).
- **Une classe de ciblage disparaît silencieusement lors d'une migration vers un composant partagé** : `.export-format-modal` (étape `confirm-export`) était posée à la main sur l'overlay avant la migration vers `BaseModal` (#151) — la migration n'a pas reporté la classe, et `BaseModal` ne forwarde pas les attrs car sa racine est un `<Teleport>` (le fallthrough automatique de Vue ne s'applique pas). Résultat : `waitForElement(".export-format-modal")` ne se résolvait jamais, driver.js restait accroché à la cible de l'étape précédente (`.export-audio-btn`) et son overlay bloquait tous les clics dans la modale, y compris "Exporter". Fix : prop dédiée `modalClass` sur `BaseModal`, posée explicitement (`modal-class="export-format-modal"`) plutôt que de compter sur le fallthrough. À vérifier pour toute nouvelle étape dont le sélecteur cible une modale/composant partagé après un refactor de style.
- **Lecture audio courte (peu de notes proches du début)** : la boucle de playback (`loopEndPosition` = fin de la dernière note) se termine en ~1s pour une mélodie de 3 notes. L'étape `play` avance donc quasi toujours via le rebouclage automatique, rarement via un arrêt manuel — à garder en tête pour tout script de vérification qui suppose un arrêt manuel après un délai fixe.
