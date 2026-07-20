<template>
  <form class="login-form" @submit.prevent="submitForm">
    <h2 v-if="showTitle">{{ title }}</h2>
    <p v-if="description" class="form-description">{{ description }}</p>

    <FormField label="Email" html-for="login-email">
      <BaseInput
        id="login-email"
        v-model="form.email"
        type="email"
        placeholder="Entrez votre email"
        required
      />
    </FormField>

    <FormField label="Mot de passe" html-for="login-password">
      <BaseInput
        id="login-password"
        v-model="form.password"
        type="password"
        placeholder="Entrez votre mot de passe"
        required
      />
    </FormField>

    <div v-if="error" class="error-message">{{ error }}</div>

    <BaseButton
      type="submit"
      class="submit-button"
      :disabled="isLoading"
      :loading="isLoading"
    >
      Se connecter
    </BaseButton>

    <div v-if="googleAuthEnabled" class="google-login">
      <div class="separator">
        <span>ou</span>
      </div>
      <a :href="googleAuthUrl" class="google-button">
        <svg class="google-icon" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </a>
    </div>

    <div v-if="showFooter" class="form-footer">
      <router-link :to="{ name: 'app-forgot-password' }" class="forgot-link">
        Mot de passe oublié ?
      </router-link>
      <router-link :to="{ name: 'app-register' }" class="register-link">
        Pas encore inscrit ? Créer un compte
      </router-link>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import apiClient from "../../lib/utils/apiClient";
import { useAuthStore } from "../../stores/authStore";
import type { User } from "../../lib/utils/types";
import FormField from "../ui/FormField.vue";
import BaseInput from "../ui/BaseInput.vue";
import BaseButton from "../ui/BaseButton.vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    showTitle?: boolean;
    showFooter?: boolean;
    redirectPath?: string;
  }>(),
  {
    title: "Connexion",
    showTitle: true,
    showFooter: true,
  },
);

const emit = defineEmits<{
  success: [user: User];
}>();

const authStore = useAuthStore();

const form = reactive({
  email: "",
  password: "",
});
const isLoading = ref(false);
const error = ref("");

const googleAuthEnabled = computed(() => authStore.googleAuthEnabled);
const googleAuthUrl = computed(() => {
  const baseUrl = "/api/auth/google";
  return props.redirectPath
    ? `${baseUrl}?redirect=${encodeURIComponent(props.redirectPath)}`
    : baseUrl;
});

async function submitForm() {
  isLoading.value = true;
  error.value = "";

  const result = await apiClient.post<{ user: User }>("/auth/login", form);

  if (result.error) {
    error.value = "Identifiants incorrects";
  } else if (result.data?.user) {
    authStore.user = result.data.user;
    emit("success", result.data.user);
    form.email = "";
    form.password = "";
  }

  isLoading.value = false;
}
</script>

<style scoped>
.login-form {
  width: 100%;
}

.login-form h2 {
  color: var(--color-white);
  text-align: left;
  margin-bottom: 24px;
  font-size: 1.8rem;
}

.form-description {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.submit-button {
  width: 100%;
}

.error-message {
  color: var(--color-error-light);
  font-size: 0.9rem;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(var(--color-error-light-rgb), 0.1);
  border-radius: 6px;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-secondary);
}

.forgot-link,
.register-link {
  color: var(--color-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
  display: block;
}

.forgot-link {
  margin-bottom: 12px;
}

.forgot-link:hover,
.register-link:hover {
  color: var(--color-secondary-hover);
  text-decoration: underline;
}

.google-login {
  margin-top: 20px;
}

.separator {
  display: flex;
  align-items: center;
  text-align: center;
  margin-bottom: 16px;
}

.separator::before,
.separator::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--color-border-secondary);
}

.separator span {
  padding: 0 12px;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

/* stylelint-disable color-no-hex -- charte officielle du bouton "Se connecter avec Google", ne pas retokeniser */
.google-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 20px;
  background-color: #1f1f1f;
  color: #fff;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.google-button:hover {
  background-color: #2d2d2d;
  border-color: #555;
}
/* stylelint-enable color-no-hex */

.google-icon {
  width: 20px;
  height: 20px;
}
</style>
