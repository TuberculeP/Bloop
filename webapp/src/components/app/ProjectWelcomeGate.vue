<script setup lang="ts">
defineProps<{
  projectName: string;
  ownerName?: string;
  loading: boolean;
}>();

defineEmits<{
  (e: "load"): void;
}>();
</script>

<template>
  <div class="welcome-gate">
    <div class="gate-card">
      <img
        src="../../assets/stan_standing.svg"
        class="gate-mascot"
        alt=""
        aria-hidden="true"
      />

      <div class="gate-meta" v-if="ownerName">
        <span class="gate-label">Projet partagé par</span>
        <span class="gate-owner">{{ ownerName }}</span>
      </div>

      <h1 class="gate-title">{{ projectName }}</h1>

      <p class="gate-hint" v-if="ownerName">
        Vous pouvez explorer ce projet en lecture seule, le réinitialiser ou le
        cloner dans votre espace.
      </p>

      <button class="gate-btn" :disabled="loading" @click="$emit('load')">
        <i class="fas fa-play" />
        {{ loading ? "Chargement…" : "Ouvrir le projet" }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome-gate {
  position: fixed;
  inset: 0;
  /* stylelint-disable-next-line color-no-hex -- fond décoratif propre à cet écran d'accueil de projet */
  background: #0f0810;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.gate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  padding: 48px 40px;
  background: var(--color-bg-secondary-dark);
  border: 1px solid rgba(var(--color-accent3-rgb), 0.4);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

.gate-mascot {
  width: 140px;
  height: 140px;
  object-fit: contain;
  margin-bottom: 8px;
}

.gate-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gate-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-white-light);
  opacity: 0.5;
}

.gate-owner {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent3-hover);
}

.gate-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-white);
  line-height: 1.15;
  letter-spacing: -0.5px;
  margin: 0;
}

.gate-hint {
  font-size: 0.875rem;
  color: var(--color-white-light);
  opacity: 0.55;
  line-height: 1.5;
  max-width: 340px;
  margin: 0;
}

.gate-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  background: var(--color-accent3);
  color: var(--color-white);
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 8px;
  box-shadow: 0 6px 20px rgba(var(--color-accent3-rgb), 0.45);

  &:hover:not(:disabled) {
    background: var(--color-accent3-hover);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(155, 36, 88, 0.6);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
    transform: none;
  }
}
</style>
