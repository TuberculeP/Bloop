<template>
  <div class="reset-password-container">
    <form class="form-container" @submit.prevent="submitForm">
      <h2>Nouveau mot de passe</h2>
      <p class="form-description">Entrez votre nouveau mot de passe.</p>

      <FormField label="Nouveau mot de passe" html-for="password">
        <BaseInput
          id="password"
          type="password"
          v-model="form.password"
          placeholder="Entrez votre nouveau mot de passe"
          required
          minlength="8"
        />
      </FormField>

      <FormField label="Confirmer le mot de passe" html-for="confirmPassword">
        <BaseInput
          id="confirmPassword"
          type="password"
          v-model="form.confirmPassword"
          placeholder="Confirmez votre mot de passe"
          required
          minlength="8"
        />
      </FormField>

      <BaseButton
        type="submit"
        class="submit-button"
        :disabled="isLoading"
        :loading="isLoading"
        label="Modifier le mot de passe"
      />

      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div class="form-footer">
        <router-link :to="{ name: 'app-login' }" class="back-link">
          Retour à la connexion
        </router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import apiClient from "../../lib/utils/apiClient";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseButton from "../../components/ui/BaseButton.vue";

const route = useRoute();
const router = useRouter();

const form = reactive({
  password: "",
  confirmPassword: "",
});

const isLoading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const token = ref("");

onMounted(() => {
  token.value = route.query.token as string;
  if (!token.value) {
    errorMessage.value = "Lien de réinitialisation invalide.";
  }
});

async function submitForm() {
  if (form.password !== form.confirmPassword) {
    errorMessage.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  if (form.password.length < 8) {
    errorMessage.value = "Le mot de passe doit contenir au moins 8 caractères.";
    return;
  }

  isLoading.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  const result = await apiClient.post("/auth/reset-password", {
    token: token.value,
    password: form.password,
  });

  isLoading.value = false;

  if (!result.error) {
    successMessage.value = "Mot de passe modifié avec succès !";
    setTimeout(() => {
      router.push({ name: "app-login" });
    }, 2000);
  } else {
    errorMessage.value =
      "Le lien a expiré ou est invalide. Veuillez refaire une demande.";
  }
}
</script>

<style scoped>
.reset-password-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 20px;
}

.form-container {
  max-width: 400px;
  width: 100%;
}

.form-container h2 {
  color: var(--color-white);
  text-align: left;
  margin-bottom: 12px;
  font-size: 1.8rem;
}

.form-description {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  font-size: 0.9rem;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-secondary);
}

.back-link {
  color: var(--color-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--color-secondary-hover);
  text-decoration: underline;
}

.success-message {
  color: var(--color-success);
  text-align: center;
  margin-top: 16px;
  font-size: 0.9rem;
}

.error-message {
  color: var(--color-error);
  text-align: center;
  margin-top: 16px;
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .form-container {
    padding: 24px;
    margin: 16px;
  }

  .reset-password-container {
    min-height: 70vh;
  }
}
</style>
