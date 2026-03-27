<template>
  <div class="app-layout">
    <LandingHeader no-animations />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import LandingHeader from "../components/landing/LandingHeader.vue";
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 80px;
}
</style>
