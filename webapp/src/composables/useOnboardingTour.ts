import { driver, type Driver, type Popover } from "driver.js";
import "driver.js/dist/driver.css";
import "../styles/onboarding.css";
import { watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useOnboardingStore } from "../stores/onboardingStore";
import { useTimelineStore } from "../stores/timelineStore";
import { ONBOARDING_STEPS } from "../lib/onboarding/steps";

const waitForElement = (selector: string): Promise<void> =>
  new Promise((resolve) => {
    const check = () => {
      if (document.querySelector(selector)) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

export function useOnboardingTour() {
  const onboardingStore = useOnboardingStore();
  const timelineStore = useTimelineStore();
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
      showButtons: [],
    });
    driverObj.highlight({ element: selector, popover });
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
  };

  const waitForInstrumentMenu = async () => {
    await waitForElement(".instrument-menu");
    if (!onboardingStore.isActive || onboardingStore.currentStepIndex !== 1)
      return;
    onboardingStore.advance();
  };

  const renderPianoRollStep = async () => {
    const step = ONBOARDING_STEPS[onboardingStore.currentStepIndex];
    await nextTick();
    await waitForElement(".piano-grid-canvas");
    if (!onboardingStore.isActive) return;
    highlight(".piano-grid-canvas", {
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
        if (onboardingStore.currentStepIndex !== 2 || length <= prevLength)
          return;
        const newTrack = timelineStore.tracks[timelineStore.tracks.length - 1];
        // Une piste audio n'a pas de piano roll : on attend qu'une piste
        // MIDI (synth/sampler) soit ajoutée avant de passer à l'étape suivante.
        if (newTrack.instrument.type === "audioTrack") return;
        onboardingStore.targetTrackId = newTrack.id;
        onboardingStore.advance();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () => timelineStore.expandedTrackId,
      (expandedId) => {
        if (!onboardingStore.isActive || onboardingStore.currentStepIndex !== 3)
          return;
        if (expandedId !== onboardingStore.targetTrackId) return;
        renderPianoRollStep();
      },
    ),
  );

  stopWatchers.push(
    watch(
      () =>
        timelineStore.tracks.find((t) => t.id === onboardingStore.targetTrackId)
          ?.notes.length ?? 0,
      (noteCount) => {
        if (!onboardingStore.isActive || onboardingStore.currentStepIndex !== 3)
          return;
        if (noteCount >= 3) onboardingStore.complete();
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
