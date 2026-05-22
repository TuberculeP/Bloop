<script setup lang="ts">
defineProps({
  message: { type: String, default: "Chargement en cours…" },
});
</script>

<template>
  <div class="loading-card">
    <img src="../../assets/stan_dance.gif" alt="" aria-hidden="true" />
    <p class="loading-message">{{ message }}</p>
    <div class="loading-dots"><span></span><span></span><span></span></div>
  </div>
</template>

<style scoped>
.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
}

.loading-card img {
  height: 160px;
  width: auto;
  object-fit: contain;
}

.loading-message {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-white);
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-secondary);
  animation: blink 1.2s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
