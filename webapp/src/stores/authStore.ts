import { defineStore } from "pinia";
import type { User } from "../lib/utils/types";
import { ref, computed } from "vue";
import apiClient, { setAuthErrorHandler } from "../lib/utils/apiClient";

export const useAuthStore = defineStore("authStore", () => {
  const user = ref<User>();
  const isAuthenticated = computed(() => !!user.value);
  const googleAuthEnabled = ref(false);
  const sessionExpired = ref(false);

  function handleSessionExpired() {
    // Ne déclencher que si l'utilisateur ÉTAIT connecté (pas au premier /auth/check)
    if (sessionExpired.value || !user.value) return;
    sessionExpired.value = true;
    user.value = undefined;
  }

  function clearSessionExpired() {
    sessionExpired.value = false;
  }

  async function loadConfig() {
    const config = await apiClient.get<{ googleAuthEnabled: boolean }>(
      "/auth/config",
    );
    if (config.data) {
      googleAuthEnabled.value = config.data.googleAuthEnabled;
    }
  }

  // Connecter le handler d'erreur auth
  setAuthErrorHandler(handleSessionExpired);

  return {
    user,
    isAuthenticated,
    googleAuthEnabled,
    sessionExpired,
    loadConfig,
    handleSessionExpired,
    clearSessionExpired,
  };
});
