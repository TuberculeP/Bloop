import { driver, type Driver, type Popover } from "driver.js";
import "driver.js/dist/driver.css";
import "../styles/onboarding.css";
import { watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useOnboardingStore } from "../stores/onboardingStore";
import { useTimelineStore } from "../stores/timelineStore";
import { useProjectStore } from "../stores/projectStore";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "../lib/onboarding/steps";

const STEP_INDEX = new Map(
  ONBOARDING_STEPS.map((step, index) => [step.id, index]),
);
const stepIndex = (id: OnboardingStepId) => STEP_INDEX.get(id)!;

const waitForElement = (selector: string): Promise<void> =>
  new Promise((resolve) => {
    const check = () => {
      if (document.querySelector(selector)) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

const waitForElementGone = (selector: string): Promise<void> =>
  new Promise((resolve) => {
    const check = () => {
      if (!document.querySelector(selector)) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

// Attend qu'un élément quitte sa position de départ (fromX) puis s'immobilise
// à sa position finale — utile quand un voisin flex (ex: le bouton
// Sauvegarder qui affiche temporairement "Projet sauvegardé") change de
// largeur et décale l'élément ciblé après que le spotlight l'a déjà mesuré.
const waitForPositionSettle = (
  selector: string,
  fromX: number,
): Promise<void> =>
  new Promise((resolve) => {
    let unchangedFrames = 0;
    let shiftedStableFrames = 0;
    let lastX = fromX;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) {
        const x = el.getBoundingClientRect().x;
        if (x === fromX) {
          // N'a pas encore bougé : si ça dure, c'est qu'il n'y a rien à
          // attendre (pas de décalage à corriger).
          unchangedFrames++;
          if (unchangedFrames >= 30) {
            resolve();
            return;
          }
        } else {
          shiftedStableFrames = x === lastX ? shiftedStableFrames + 1 : 0;
          lastX = x;
          if (shiftedStableFrames >= 3) {
            resolve();
            return;
          }
        }
      }
      requestAnimationFrame(check);
    };
    check();
  });

export function useOnboardingTour() {
  const onboardingStore = useOnboardingStore();
  const timelineStore = useTimelineStore();
  const projectStore = useProjectStore();
  const route = useRoute();

  let driverObj: Driver | null = null;
  const stopWatchers: Array<() => void> = [];

  const destroyDriver = () => {
    if (!driverObj) return;
    const obj = driverObj;
    driverObj = null;
    obj.destroy();
  };

  const highlight = (selector: string, popover: Popover) => {
    destroyDriver();
    driverObj = driver({
      overlayColor: "rgba(26, 14, 21, 0.75)",
      stagePadding: 6,
      stageRadius: 8,
      allowClose: false,
      allowKeyboardControl: false,
    });
    // Driver.highlight() (API impérative, hors steps+drive()) écrase
    // showButtons à [] par défaut si le popover ne le précise pas lui-même
    // (voir highlight() dans driver.js.mjs) : la config globale showButtons
    // n'est donc pas prise en compte ici, il faut le poser sur le popover.
    driverObj.highlight({
      element: selector,
      popover: {
        ...popover,
        showButtons: ["close"],
        onCloseClick: () => onboardingStore.skip(),
      },
    });
    // driver.js recentre la cible via scrollIntoView si elle n'est pas
    // entièrement visible ; sur un viewport étroit, ça décale le body
    // horizontalement (overflow-x:hidden l'empêche d'être re-scrollé par
    // l'utilisateur, donc ça reste bloqué jusqu'au refresh sans ce reset).
    document.body.scrollLeft = 0;
    document.documentElement.scrollLeft = 0;
  };

  const renderStep = async () => {
    const step = ONBOARDING_STEPS[onboardingStore.currentStepIndex];
    if (!step) return;
    await waitForElement(step.selector);
    if (!onboardingStore.isActive) return;
    highlight(step.selector, {
      title: step.title,
      description: step.description,
      side: step.side,
    });
    if (step.id === "add-track") waitForInstrumentMenu();
    if (step.id === "open-settings") waitForSettingsOpen();
    if (step.id === "open-instrument-params") waitForInstrumentParamsOpen();
    if (step.id === "close-instrument-params") waitForInstrumentParamsClose();
    if (step.id === "close-settings") waitForSettingsClose();
    if (step.id === "play") waitForPlayed();
    if (step.id === "rename-project") waitForRenameInput();
    if (step.id === "export") waitForExportModalOpen();
    if (step.id === "confirm-export") waitForExportModalClose();
  };

  const waitForInstrumentMenu = async () => {
    // Si on ré-entre sur cette étape après un mauvais choix, l'ancien menu
    // peut encore être dans le DOM (animation de sortie Vue) : on attend
    // qu'il ait vraiment disparu avant de guetter sa prochaine ouverture,
    // sinon on se résout instantanément sur l'élément en train de partir.
    await waitForElementGone(".instrument-menu");
    await waitForElement(".instrument-menu");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("add-track")
    )
      return;
    onboardingStore.advance();
  };

  const waitForSettingsOpen = async () => {
    await waitForElement(".instrument-params-btn");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("open-settings")
    )
      return;
    onboardingStore.advance();
  };

  const waitForInstrumentParamsOpen = async () => {
    await waitForElement(".instrument-params-modal .param-select");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("open-instrument-params")
    )
      return;
    onboardingStore.advance();
  };

  const waitForInstrumentParamsClose = async () => {
    await waitForElementGone(".instrument-params-modal");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("close-instrument-params")
    )
      return;
    onboardingStore.advance();
  };

  const waitForSettingsClose = async () => {
    await waitForElementGone(".settings-overlay");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("close-settings")
    )
      return;
    onboardingStore.advance();
  };

  const waitForPlaybackEnd = (loopedBefore: number | null): Promise<void> =>
    new Promise((resolve) => {
      const check = () => {
        const stillPlaying = document.querySelector(".play-btn.playing");
        if (
          !stillPlaying ||
          projectStore.lastPlaybackLoopedAt !== loopedBefore
        ) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });

  const waitForPlayed = async () => {
    await waitForElement(".play-btn.playing");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("play")
    )
      return;
    // On laisse l'utilisateur écouter sans overlay ni bulle pendant la
    // lecture ; le tour ne réapparaît qu'à l'arrêt ou après un rebouclage.
    destroyDriver();
    const loopedBefore = projectStore.lastPlaybackLoopedAt;
    await waitForPlaybackEnd(loopedBefore);
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("play")
    )
      return;
    onboardingStore.advance();
  };

  const waitForExportModalOpen = async () => {
    // Le bouton Sauvegarder juste avant dans le header change de largeur
    // ("Sauvegarder" -> "Projet sauvegardé" pendant 3s), ce qui décale son
    // voisin .export-audio-btn : on attend que ça se stabilise avant de
    // recaler le spotlight, comme pour l'ancien flow (voir waitForPositionSettle).
    const el = document.querySelector(".export-audio-btn");
    if (el) {
      const initialX = el.getBoundingClientRect().x;
      await waitForPositionSettle(".export-audio-btn", initialX);
      if (
        onboardingStore.isActive &&
        onboardingStore.currentStepIndex === stepIndex("export")
      ) {
        const step = ONBOARDING_STEPS[stepIndex("export")];
        highlight(".export-audio-btn", {
          title: step.title,
          description: step.description,
          side: step.side,
        });
      }
    }

    // Le clic sur le bouton header ouvre la modale de choix de format : une
    // fois affichée, on passe à l'étape suivante qui la highlight elle-même.
    await waitForElement(".export-format-modal");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("export")
    )
      return;
    onboardingStore.advance();
  };

  const waitForExportModalClose = async () => {
    // La modale se ferme aussi bien quand l'export est confirmé (elle
    // disparaît dès le clic, avant même la fin du rendu) que sur "Annuler" :
    // on distingue les deux via l'overlay de progression, qui n'apparaît que
    // dans le premier cas.
    await waitForElementGone(".export-format-modal");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("confirm-export")
    )
      return;
    if (document.querySelector(".export-overlay")) return;
    onboardingStore.currentStepIndex = stepIndex("export");
  };

  const waitForRenameInput = async () => {
    // Le double-clic remplace le <span> ciblé par un <input> (v-if/v-else) :
    // driver.js garde une référence à l'ancien nœud, désormais détaché, et
    // bloque les clics/le focus sur le nouvel input (hors zone active). On
    // déplace explicitement le spotlight vers l'input dès qu'il apparaît.
    await waitForElement(".project-name-input");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("rename-project")
    )
      return;
    const step = ONBOARDING_STEPS[stepIndex("rename-project")];
    highlight(".project-name-input", {
      title: step.title,
      description: step.description,
      side: step.side,
    });
    // Si l'édition est annulée sans changement de nom, l'input redevient un
    // span : on replace le spotlight sur le label et on réarme l'attente.
    await waitForElementGone(".project-name-input");
    if (
      !onboardingStore.isActive ||
      onboardingStore.currentStepIndex !== stepIndex("rename-project")
    )
      return;
    renderStep();
  };

  const renderPianoRollStep = async () => {
    const step = ONBOARDING_STEPS[onboardingStore.currentStepIndex];
    const target = step.expandedSelector ?? step.selector;
    await nextTick();
    await waitForElement(target);
    if (!onboardingStore.isActive) return;
    highlight(target, {
      title: step.title,
      description: step.description,
      side: "top",
    });
  };

  stopWatchers.push(
    watch(
      () => route.name,
      (name) => {
        if (!onboardingStore.isActive) return;
        if (
          onboardingStore.currentStepIndex === 0 &&
          name === "app-sequencer"
        ) {
          onboardingStore.advance();
        }
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => timelineStore.tracks.length,
      (length, prevLength) => {
        if (!onboardingStore.isActive) return;
        if (
          onboardingStore.currentStepIndex !== stepIndex("add-instrument") ||
          length <= prevLength
        )
          return;
        const newTrack = timelineStore.tracks[timelineStore.tracks.length - 1];
        // La suite du parcours (choix de la flûte) suppose un sampler : si
        // un autre instrument est choisi, on supprime la piste et on
        // renvoie sur "add-track" pour forcer un nouveau choix via le menu.
        if (newTrack.instrument.type !== "smplr") {
          timelineStore.deleteTrack(newTrack.id);
          onboardingStore.currentStepIndex = stepIndex("add-track");
          return;
        }
        onboardingStore.targetTrackId = newTrack.id;
        onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => timelineStore.expandedTrackId,
      (expandedId) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("add-notes")
        )
          return;
        if (expandedId !== onboardingStore.targetTrackId) return;
        renderPianoRollStep();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => {
        const track = timelineStore.tracks.find(
          (t) => t.id === onboardingStore.targetTrackId,
        );
        return track?.instrument.type === "smplr"
          ? (track.instrument as { soundfont?: string }).soundfont
          : null;
      },
      (soundfont) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("select-instrument")
        )
          return;
        if (soundfont === "flute") onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () =>
        timelineStore.tracks.find((t) => t.id === onboardingStore.targetTrackId)
          ?.notes.length ?? 0,
      (noteCount) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("add-notes")
        )
          return;
        if (noteCount >= 3) onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => timelineStore.project.name,
      (name) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("rename-project")
        )
          return;
        if (name !== "Nouveau Projet") onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => projectStore.lastSavedAt,
      (savedAt) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("save") ||
          !savedAt
        )
          return;
        onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => projectStore.lastExportedAt,
      (exportedAt) => {
        if (
          !onboardingStore.isActive ||
          onboardingStore.currentStepIndex !== stepIndex("confirm-export") ||
          !exportedAt
        )
          return;
        onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => onboardingStore.currentStepIndex,
      () => {
        if (onboardingStore.isActive) renderStep();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => onboardingStore.isActive,
      (active) => {
        if (active) renderStep();
        else destroyDriver();
      },
      { immediate: true },
    ),
  );

  const cleanup = () => {
    destroyDriver();
    stopWatchers.forEach((stop) => stop());
    stopWatchers.length = 0;
  };

  return { cleanup };
}
