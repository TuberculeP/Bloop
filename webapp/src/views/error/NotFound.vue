<template>
  <AppLayout>
    <main class="error-page">
      <div class="error-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Cette page n'existe pas</h2>
        <p class="error-description">
          Le lien est peut-être cassé, ou la page a été déplacée. Vérifie
          l'adresse, ou repars de l'accueil.
        </p>

        <div class="error-actions">
          <BaseButton
            size="large"
            variant="outline"
            color="white"
            label="Retour à l'accueil"
            left-icon="fas fa-home"
            @click="goHome"
          />
          <BaseButton size="large" label="Se connecter" @click="goLogin" />
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import BaseButton from "../../components/ui/BaseButton.vue";
import AppLayout from "../../layouts/AppLayout.vue";

const router = useRouter();

const goHome = () => {
  router.push("/");
};

const goLogin = () => {
  router.push("/login");
};
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  padding: 2rem;
}

.error-container {
  max-width: 480px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.error-code {
  font-size: clamp(4rem, 12vw, 7rem);
  line-height: 1;
  color: var(--color-error);
}

.error-title {
  font-size: 1.5rem;
  color: var(--color-white);
}

.error-description {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
}

.error-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
</style>
