<template>
  <Teleport to="body">
    <div v-if="authStore.sessionExpired" class="modal-overlay">
      <div class="modal-content">
        <LoginForm
          title="Session expirée"
          description="Votre session a expiré. Vos modifications locales sont conservées."
          :show-footer="false"
          @success="handleSuccess"
        />
        <a href="/login" class="logout-link"
          >Retourner à la page de connexion</a
        >
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from "../../stores/authStore";
import LoginForm from "../auth/LoginForm.vue";

const authStore = useAuthStore();

function handleSuccess() {
  authStore.clearSessionExpired();
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: var(--color-background, #1a1a1a);
  border: 1px solid var(--color-border-secondary, #333);
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
}

.logout-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-secondary, #333);
  color: var(--color-text-secondary, #888);
  text-decoration: none;
  font-size: 0.9rem;
}

.logout-link:hover {
  color: var(--color-secondary, #aaa);
  text-decoration: underline;
}
</style>
