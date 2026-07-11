<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { onSocketConnected } from "./lib/utils/websocket";
import { useAuthStore } from "./stores/authStore";
import apiClient from "./lib/utils/apiClient";
import type { User } from "./lib/utils/types";
import SessionExpiredModal from "./components/ui/SessionExpiredModal.vue";
import ToastContainer from "./components/ui/ToastContainer.vue";
import { useOnboardingTour } from "./composables/useOnboardingTour";

const authStore = useAuthStore();

const { cleanup: cleanupOnboardingTour } = useOnboardingTour();
onBeforeUnmount(cleanupOnboardingTour);

onMounted(async () => {
  const check = await apiClient.get<{ user: User }>("/auth/check");
  if (check.data?.user) {
    authStore.user = check.data.user;
  }
});

onSocketConnected((socket) => {
  socket.emit("test", { message: "Hello from Vue!" });
});
</script>

<template>
  <SessionExpiredModal />
  <ToastContainer />
  <RouterView />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  min-height: 100vh;
}
</style>
