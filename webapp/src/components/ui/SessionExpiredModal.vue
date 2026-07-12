<template>
  <BaseModal
    :model-value="authStore.sessionExpired"
    :close-on-overlay-click="false"
    @update:model-value="() => {}"
  >
    <LoginForm
      title="Session expirée"
      description="Votre session a expiré. Vos modifications locales sont conservées."
      :show-footer="false"
      @success="handleSuccess"
    />
    <a href="/login" class="logout-link">Retourner à la page de connexion</a>
  </BaseModal>
</template>

<script setup lang="ts">
import { useAuthStore } from "../../stores/authStore";
import LoginForm from "../auth/LoginForm.vue";
import BaseModal from "./BaseModal.vue";

const authStore = useAuthStore();

function handleSuccess() {
  authStore.clearSessionExpired();
}
</script>

<style scoped>
.logout-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
}

.logout-link:hover {
  color: var(--color-secondary);
  text-decoration: underline;
}
</style>
