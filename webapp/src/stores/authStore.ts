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

  async function updateAvatar(file: File): Promise<{ error: string | null }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/user/avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || "Upload failed" };
    }

    if (user.value) {
      user.value.profilePicture = data.user.profilePicture;
    }

    return { error: null };
  }

  // Connecter le handler d'erreur auth
  setAuthErrorHandler(handleSessionExpired);

  return {
    user,
    isAuthenticated,
    googleAuthEnabled,
    sessionExpired,
    loadConfig,
    updateAvatar,
    handleSessionExpired,
    clearSessionExpired,
  };
});
