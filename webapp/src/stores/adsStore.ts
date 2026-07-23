import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "display-ads";

export const useAdsStore = defineStore("ads", () => {
  const isEnabled = ref(localStorage.getItem(STORAGE_KEY) !== "false");

  const enable = () => {
    isEnabled.value = true;
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const disable = () => {
    isEnabled.value = false;
    localStorage.setItem(STORAGE_KEY, "false");
  };

  const toggle = () => {
    if (isEnabled.value) {
      disable();
    } else {
      enable();
    }
  };

  return {
    isEnabled,
    enable,
    disable,
    toggle,
  };
});
