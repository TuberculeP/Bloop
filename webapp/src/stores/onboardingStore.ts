import { defineStore } from "pinia";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ONBOARDING_STEPS } from "../lib/onboarding/steps";

const SEEN_KEY = "bloop-onboarding-seen";
const COMPLETED_KEY = "bloop-onboarding-completed";

export const useOnboardingStore = defineStore("onboarding", () => {
  const router = useRouter();

  const isActive = ref(false);
  const currentStepIndex = ref(0);
  const targetTrackId = ref<string | null>(null);

  const hasSeen = () => localStorage.getItem(SEEN_KEY) === "true";
  const markSeen = () => localStorage.setItem(SEEN_KEY, "true");
  const hasCompleted = () => localStorage.getItem(COMPLETED_KEY) === "true";

  const start = () => {
    currentStepIndex.value =
      router.currentRoute.value.name === "app-sequencer" ? 1 : 0;
    targetTrackId.value = null;
    isActive.value = true;
  };

  const advance = () => {
    if (currentStepIndex.value >= ONBOARDING_STEPS.length - 1) {
      complete();
      return;
    }
    currentStepIndex.value += 1;
  };

  const complete = () => {
    isActive.value = false;
    localStorage.setItem(COMPLETED_KEY, "true");
  };

  const skip = () => {
    isActive.value = false;
  };

  return {
    isActive,
    currentStepIndex,
    targetTrackId,
    hasSeen,
    markSeen,
    hasCompleted,
    start,
    advance,
    complete,
    skip,
  };
});
