import { useLocalStorage } from "@vueuse/core";
import type { Ref } from "vue";

const UI_LAYOUT_STORAGE_PREFIX = "bloop-ui-";

// Préférences UI/layout (largeur de panneau, onglet actif, état replié...),
// namespacées sous bloop-ui-* — distinct des données de projet
// (bloop-sequencer-project, bloop-timeline-project) et des flags onboarding.
export function useUiLayoutPreference<T>(key: string, defaultValue: T): Ref<T> {
  return useLocalStorage(`${UI_LAYOUT_STORAGE_PREFIX}${key}`, defaultValue);
}
