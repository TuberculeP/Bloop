<template>
  <div class="app-layout">
    <main class="app-main">
      <AppHeader v-if="!isSequencerPage || isErrorPage" />
      <slot />

      <div v-if="!isMobile" class="parallax-layer" ref="layer1">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from "../components/ui/AppHeader.vue";
import { useRoute } from "vue-router";
import { ref } from "vue";

const route = useRoute();
const currentPath = route.path;
const isSequencerPage = currentPath.startsWith("/app/sequencer");
const isErrorPage =
  currentPath.startsWith("/403") || currentPath.startsWith("/404");

const isMobile = ref(
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 768px)").matches
    : false,
);
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}

.app-layout::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    var(--color-bg-primary-dark) 0%,
    var(--color-bg-secondary-dark) 50%,
    var(--color-primary-active) 100%
  );
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Gradient Orbs */
.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float-orb 20s ease-in-out infinite;
  pointer-events: none;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(
    circle,
    rgba(255, 210, 105, 0.4) 0%,
    transparent 70%
  );
  top: 5%;
  right: -10%;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(145, 165, 249, 0.4) 0%,
    transparent 70%
  );
  bottom: 20%;
  left: -10%;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(124, 200, 245, 0.3) 0%,
    transparent 70%
  );
  top: 40%;
  left: 30%;
}
</style>
