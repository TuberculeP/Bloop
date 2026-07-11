<template>
  <div class="forgot-password-container">
    <form class="form-container" @submit.prevent="submitForm">
      <h2>Mot de passe oublié</h2>
      <p class="form-description">
        Entrez votre adresse email pour recevoir un lien de réinitialisation.
      </p>

      <FormField label="Email" html-for="email">
        <BaseInput
          id="email"
          type="email"
          v-model="form.email"
          placeholder="Entrez votre email"
          required
        />
      </FormField>

      <BaseButton
        type="submit"
        class="submit-button"
        :disabled="isLoading"
        :loading="isLoading"
      >
        Envoyer le lien
      </BaseButton>

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
import { reactive, ref } from "vue";
import apiClient from "../../lib/utils/apiClient";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseButton from "../../components/ui/BaseButton.vue";

const form = reactive({
  email: "",
});

const isLoading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

async function submitForm() {
  isLoading.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  const result = await apiClient.post("/auth/forgot-password", form);

  isLoading.value = false;

  if (!result.error) {
    successMessage.value =
      "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.";
    form.email = "";
  } else {
    errorMessage.value = "Une erreur est survenue. Veuillez réessayer.";
  }
}
</script>

<style scoped>
.forgot-password-container {
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

  .forgot-password-container {
    min-height: 70vh;
  }
}
</style>
